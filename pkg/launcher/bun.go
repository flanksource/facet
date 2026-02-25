package launcher

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/flanksource/deps"
)

func EnsureBun() (string, error) {
	if p, err := exec.LookPath("bun"); err == nil {
		return p, nil
	}

	binDir := BinDir()
	managed := filepath.Join(binDir, "bun")
	if _, err := os.Stat(managed); err == nil {
		return managed, nil
	}

	if err := os.MkdirAll(binDir, 0755); err != nil {
		return "", fmt.Errorf("creating bin dir: %w", err)
	}

	result, err := deps.Install("bun", "latest", deps.WithBinDir(binDir))
	if err != nil {
		return "", fmt.Errorf("installing bun: %w", err)
	}

	bunPath := filepath.Join(result.BinDir, "bun")
	if _, err := os.Stat(bunPath); err != nil {
		return "", fmt.Errorf("bun binary not found after install at %s", bunPath)
	}

	return bunPath, nil
}
