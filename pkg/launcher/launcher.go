package launcher

import (
	"fmt"
	"os"
	"path/filepath"
	"syscall"
)

type Options struct {
	Version string
	Commit  string
	Tarball []byte
	Args    []string
}

func Run(opts Options) error {
	if isVersionFlag(opts.Args) {
		fmt.Printf("facet %s (%s)\n", opts.Version, opts.Commit)
		return nil
	}

	cacheDir, err := EnsureCache(opts.Version, opts.Tarball)
	if err != nil {
		return fmt.Errorf("cache setup: %w", err)
	}

	bunPath, err := EnsureBun()
	if err != nil {
		return fmt.Errorf("bun setup: %w", err)
	}

	if chrome := DetectChrome(); chrome != "" {
		os.Setenv("PUPPETEER_EXECUTABLE_PATH", chrome)
	}

	os.Setenv("FACET_PACKAGE_ROOT", cacheDir)

	cliEntry := filepath.Join(cacheDir, "cli", "src", "cli.ts")
	argv := append([]string{"bun", "run", cliEntry}, opts.Args...)
	env := os.Environ()

	return syscall.Exec(bunPath, argv, env)
}

func isVersionFlag(args []string) bool {
	for _, a := range args {
		if a == "--version" || a == "-V" {
			return true
		}
	}
	return false
}
