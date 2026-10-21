package lsp

import (
	"context"
	"errors"
	"io"
	"testing"
	"time"

	"github.com/microsoft/TypeScript/tsc/internal/bundled"
	"github.com/microsoft/TypeScript/tsc/internal/json"
	"github.com/microsoft/TypeScript/tsc/internal/jsonrpc"
	"github.com/microsoft/TypeScript/tsc/internal/lsp/lsproto"
	"github.com/microsoft/TypeScript/tsc/internal/tspath"
	"github.com/microsoft/TypeScript/tsc/internal/vfs/vfstest"
)

type lifecycleTestRead struct {
	message *lsproto.Message
	err     error
}

type lifecycleTestTransport struct {
	writeErrors chan error
	input       chan lifecycleTestRead
	output      chan *lsproto.Message
	done        <-chan struct{}
}

func (tr *lifecycleTestTransport) Read() (*lsproto.Message, error) {
	select {
	case read := <-tr.input:
		if read.err != nil {
			return nil, read.err
		}
		// Decode params as they would arrive over the wire.
		data, err := json.Marshal(read.message)
		if err != nil {
			return nil, err
		}
		var message lsproto.Message
		err = json.Unmarshal(data, &message)
		return &message, err
	case <-tr.done:
		return nil, io.EOF
	}
}

func (tr *lifecycleTestTransport) Write(message *lsproto.Message) error {
	select {
	case err := <-tr.writeErrors:
		return err
	default:
		// No write error injected.
	}
	select {
	case tr.output <- message:
		return nil
	case <-tr.done:
		return context.Canceled
	}
}

func TestServerExitLifecycle(t *testing.T) {
	t.Parallel()

	if !bundled.Embedded {
		t.Skip("bundled files are not embedded")
	}

	for _, mode := range []string{"shutdown-exit", "exit", "cancel", "read-error", "write-error", "shutdown-eof"} {
		t.Run(mode, func(t *testing.T) {
			t.Parallel()
			timeoutCtx, stopTimeout := context.WithTimeout(t.Context(), 10*time.Second)
			defer stopTimeout()
			ctx, cancel := context.WithCancel(timeoutCtx)
			defer cancel()
			transport := &lifecycleTestTransport{
				writeErrors: make(chan error, 1),
				input:       make(chan lifecycleTestRead, 1),
				output:      make(chan *lsproto.Message, 16),
				done:        timeoutCtx.Done(),
			}
			server := NewServer(&ServerOptions{
				In:                 transport,
				Out:                transport,
				Err:                io.Discard,
				Cwd:                "/test",
				FS:                 bundled.WrapFS(vfstest.FromMap(map[string]string{"/test/tsconfig.json": "{}"}, tspath.CaseInsensitive)),
				DefaultLibraryPath: bundled.LibPath(),
			})
			runErr := make(chan error, 1)
			go func() { runErr <- server.Run(ctx) }()
			send := func(message *lsproto.Message) {
				t.Helper()
				select {
				case transport.input <- lifecycleTestRead{message: message}:
					// The message is queued for the server.
				case <-timeoutCtx.Done():
					t.Fatal("timed out sending message")
				}
			}

			responses := make(chan *lsproto.ResponseMessage, 1)
			// Answer server requests and forward responses to the test.
			go func() {
				for {
					select {
					case message := <-transport.output:
						if message.Kind == jsonrpc.MessageKindRequest {
							reply := (&lsproto.ResponseMessage{ID: message.AsRequest().ID, Result: lsproto.Null{}}).Message()
							select {
							case transport.input <- lifecycleTestRead{message: reply}:
								// The reply is queued for the server.
							case <-timeoutCtx.Done():
								return
							}
						} else if message.Kind == jsonrpc.MessageKindResponse {
							select {
							case responses <- message.AsResponse():
								// The response is queued for the test.
							case <-timeoutCtx.Done():
								return
							}
						}
					case <-timeoutCtx.Done():
						return
					}
				}
			}()
			waitForResponse := func(id *jsonrpc.ID) {
				t.Helper()
				select {
				case message := <-responses:
					if message.ID == nil || *message.ID != *id || message.Error != nil {
						t.Fatalf("unexpected response: %+v", message)
					}
				case <-timeoutCtx.Done():
					t.Fatal("timed out waiting for response")
				}
			}

			initID := jsonrpc.NewIDString("initialize")
			send(lsproto.InitializeInfo.NewRequestMessage(initID, &lsproto.InitializeParams{Capabilities: &lsproto.ClientCapabilities{}}).Message())
			waitForResponse(initID)
			send(lsproto.InitializedInfo.NewNotificationMessage(&lsproto.InitializedParams{}).Message())
			select {
			case <-server.initComplete:
				// Initialization completed; exercise the termination path.
			case <-timeoutCtx.Done():
				t.Fatal("timed out initializing")
			}
			defer server.session.Close()

			var want error
			switch mode {
			case "shutdown-exit", "shutdown-eof":
				id := jsonrpc.NewIDString("shutdown")
				send((&lsproto.RequestMessage{ID: id, Method: lsproto.MethodShutdown}).Message())
				waitForResponse(id)
				if mode == "shutdown-eof" {
					transport.input <- lifecycleTestRead{err: io.EOF}
				} else {
					// Keep the reader open so EOF cannot mask the exit notification result.
					send((&lsproto.RequestMessage{Method: lsproto.MethodExit}).Message())
				}
			case "exit":
				want = context.Canceled
				send((&lsproto.RequestMessage{Method: lsproto.MethodExit}).Message())
			case "cancel":
				want = context.Canceled
				cancel()
			case "write-error":
				want = errors.New("write failure")
				transport.writeErrors <- want
				send((&lsproto.RequestMessage{ID: jsonrpc.NewIDString("shutdown"), Method: lsproto.MethodShutdown}).Message())
			case "read-error":
				want = errors.New("read failure")
				transport.input <- lifecycleTestRead{err: want}
			}
			select {
			case err := <-runErr:
				if !errors.Is(err, want) {
					t.Fatalf("Run() = %v, want %v", err, want)
				}
			case <-timeoutCtx.Done():
				t.Fatal("server did not exit")
			}
		})
	}
}
