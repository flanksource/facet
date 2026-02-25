package main

import (
	_ "embed"
	"fmt"
	"os"

	"github.com/flanksource/facet/pkg/launcher"
)

//go:embed facet-cli.tar.gz
var tarball []byte

var (
	version = "dev"
	commit  = "unknown"
)

func main() {
	if err := launcher.Run(launcher.Options{
		Version: version,
		Commit:  commit,
		Tarball: tarball,
		Args:    os.Args[1:],
	}); err != nil {
		fmt.Fprintf(os.Stderr, "facet: %v\n", err)
		os.Exit(1)
	}
}
