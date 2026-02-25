package launcher

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/flanksource/commons/files"
)

func CacheDir(version string) string {
	if dir := os.Getenv("FACET_CACHE_DIR"); dir != "" {
		return filepath.Join(dir, version)
	}
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".facet", "cache", version)
}

func BinDir() string {
	if dir := os.Getenv("FACET_CACHE_DIR"); dir != "" {
		return filepath.Join(dir, "bin")
	}
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".facet", "bin")
}

func EnsureCache(version string, tarball []byte) (string, error) {
	cacheDir := CacheDir(version)
	sentinel := filepath.Join(cacheDir, ".extracted")

	if _, err := os.Stat(sentinel); err == nil {
		return cacheDir, nil
	}

	if err := os.MkdirAll(cacheDir, 0755); err != nil {
		return "", fmt.Errorf("creating cache dir: %w", err)
	}

	tmpFile, err := os.CreateTemp("", "facet-cli-*.tar.gz")
	if err != nil {
		return "", fmt.Errorf("creating temp file: %w", err)
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.Write(tarball); err != nil {
		tmpFile.Close()
		return "", fmt.Errorf("writing tarball: %w", err)
	}
	tmpFile.Close()

	if _, err := files.Unarchive(tmpFile.Name(), cacheDir, files.WithOverwrite(true)); err != nil {
		return "", fmt.Errorf("extracting tarball: %w", err)
	}

	if err := os.WriteFile(sentinel, []byte(version), 0644); err != nil {
		return "", fmt.Errorf("writing sentinel: %w", err)
	}

	return cacheDir, nil
}
