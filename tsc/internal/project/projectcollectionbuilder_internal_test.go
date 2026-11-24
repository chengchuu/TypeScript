package project

import (
	"testing"

	"github.com/microsoft/TypeScript/tsc/internal/core"
	"github.com/microsoft/TypeScript/tsc/internal/tspath"
	"gotest.tools/v3/assert"
)

func TestPruneAfterCachedMatch(t *testing.T) {
	t.Parallel()

	root := searchNode{configFileName: "/solution.json", loadKind: projectLoadKindCreate}
	candidates := []searchNode{
		{configFileName: "/earlier.json", loadKind: projectLoadKindCreate},
		{configFileName: "/cached.json", loadKind: projectLoadKindCreate},
		{configFileName: "/later.json", loadKind: projectLoadKindCreate},
		{configFileName: "/last.json", loadKind: projectLoadKindCreate},
	}
	keyFor := func(node searchNode) searchNodeKey {
		return searchNodeKey{configFileName: node.configFileName, loadKind: node.loadKind}
	}

	var remaining []tspath.RootedFilePath
	core.BreadthFirstSearchParallelEx(
		root,
		func(node searchNode) []searchNode {
			if node == root {
				return candidates
			}
			return nil
		},
		func(searchNode) (bool, bool) { return false, false },
		core.BreadthFirstSearchOptions[searchNodeKey, searchNode]{
			PreprocessLevel: func(level *core.BreadthFirstSearchLevel[searchNodeKey, searchNode]) {
				if level.Has(keyFor(root)) {
					return
				}
				pruneAfterCachedMatch(level, func(key searchNodeKey, _ searchNode) bool {
					return key.configFileName == "/cached.json"
				})
				level.Range(func(key searchNodeKey, _ searchNode) bool {
					remaining = append(remaining, key.configFileName)
					return true
				})
			},
		},
		keyFor,
	)
	assert.DeepEqual(t, remaining, []tspath.RootedFilePath{"/earlier.json", "/cached.json"})
}
