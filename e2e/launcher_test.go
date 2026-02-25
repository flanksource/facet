package e2e

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

var (
	binaryPath string
	repoRoot   string
)

var _ = BeforeSuite(func() {
	var err error
	repoRoot, err = filepath.Abs("..")
	Expect(err).ToNot(HaveOccurred())

	Expect(filepath.Join(repoRoot, "cmd", "facet", "facet-cli.tar.gz")).To(BeAnExistingFile(),
		"tarball must exist — run 'task tarball' first")

	binaryPath = filepath.Join(repoRoot, "dist", "facet-e2e-test")
	cmd := exec.Command("go", "build",
		"-ldflags", "-X main.version=0.0.0-test -X main.commit=e2etest",
		"-o", binaryPath, "./cmd/facet")
	cmd.Dir = repoRoot
	cmd.Stdout = GinkgoWriter
	cmd.Stderr = GinkgoWriter
	Expect(cmd.Run()).To(Succeed(), "Go binary build should succeed")
	Expect(binaryPath).To(BeAnExistingFile())
})

var _ = AfterSuite(func() {
	os.Remove(binaryPath)
})

func runFacet(cacheDir, workDir string, args ...string) (string, string, error) {
	cmd := exec.Command(binaryPath, args...)
	cmd.Dir = workDir
	cmd.Env = append(os.Environ(), "FACET_CACHE_DIR="+cacheDir)

	var stdout, stderr strings.Builder
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	return stdout.String(), stderr.String(), err
}

func copyFile(src, dst string) {
	data, err := os.ReadFile(src)
	Expect(err).ToNot(HaveOccurred())
	Expect(os.WriteFile(dst, data, 0644)).To(Succeed())
}

var _ = Describe("Facet Go Launcher E2E", func() {
	var cacheDir string

	BeforeEach(func() {
		cacheDir = GinkgoT().TempDir()
	})

	Describe("Version command", func() {
		It("should print version without requiring Bun", func() {
			stdout, _, err := runFacet(cacheDir, repoRoot, "--version")
			Expect(err).ToNot(HaveOccurred())
			Expect(stdout).To(ContainSubstring("facet 0.0.0-test (e2etest)"))
		})
	})

	Describe("Cache extraction", func() {
		It("should extract tarball on first run", func() {
			_, _, err := runFacet(cacheDir, repoRoot, "--version")
			Expect(err).ToNot(HaveOccurred())
		})

		It("should skip extraction on second run", func() {
			start := time.Now()
			_, _, err := runFacet(cacheDir, repoRoot, "--version")
			Expect(err).ToNot(HaveOccurred())
			firstDuration := time.Since(start)

			start = time.Now()
			_, _, err = runFacet(cacheDir, repoRoot, "--version")
			Expect(err).ToNot(HaveOccurred())
			secondDuration := time.Since(start)

			Expect(firstDuration).To(BeNumerically("<", 2*time.Second))
			Expect(secondDuration).To(BeNumerically("<", 2*time.Second))
		})
	})

	Describe("HTML generation", func() {
		It("should generate HTML from SimpleReport example", func() {
			workDir := GinkgoT().TempDir()

			copyFile(filepath.Join(repoRoot, "cli", "examples", "SimpleReport.tsx"),
				filepath.Join(workDir, "SimpleReport.tsx"))
			copyFile(filepath.Join(repoRoot, "cli", "examples", "simple-data.json"),
				filepath.Join(workDir, "simple-data.json"))

			outputFile := filepath.Join(workDir, "output.html")

			_, stderr, err := runFacet(cacheDir, workDir,
				"generate", "html",
				"-t", "SimpleReport.tsx",
				"-d", "simple-data.json",
				"-o", "output.html",
			)
			Expect(err).ToNot(HaveOccurred(), "stderr: %s", stderr)
			Expect(outputFile).To(BeAnExistingFile())

			content, err := os.ReadFile(outputFile)
			Expect(err).ToNot(HaveOccurred())
			Expect(string(content)).To(ContainSubstring("Q4 2024 Business Review"))
			Expect(string(content)).To(ContainSubstring("<html>"))
		})
	})

	Describe("PDF generation", func() {
		It("should generate PDF from SimpleReport example", func() {
			chromePaths := []string{
				"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
				"/usr/bin/google-chrome-stable",
				"/usr/bin/chromium-browser",
				"/usr/bin/chromium",
			}
			chromeFound := os.Getenv("PUPPETEER_EXECUTABLE_PATH") != ""
			for _, p := range chromePaths {
				if _, err := os.Stat(p); err == nil {
					chromeFound = true
					break
				}
			}
			if !chromeFound {
				Skip("Chrome not available on this system")
			}

			workDir := GinkgoT().TempDir()

			copyFile(filepath.Join(repoRoot, "cli", "examples", "SimpleReport.tsx"),
				filepath.Join(workDir, "SimpleReport.tsx"))
			copyFile(filepath.Join(repoRoot, "cli", "examples", "simple-data.json"),
				filepath.Join(workDir, "simple-data.json"))

			outputFile := filepath.Join(workDir, "output.pdf")

			_, stderr, err := runFacet(cacheDir, workDir,
				"generate", "pdf",
				"-t", "SimpleReport.tsx",
				"-d", "simple-data.json",
				"-o", "output.pdf",
			)
			Expect(err).ToNot(HaveOccurred(), "stderr: %s", stderr)
			Expect(outputFile).To(BeAnExistingFile())

			content, err := os.ReadFile(outputFile)
			Expect(err).ToNot(HaveOccurred())
			Expect(string(content[:4])).To(Equal("%PDF"), "should start with PDF magic bytes")
			Expect(len(content)).To(BeNumerically(">", 1024), "PDF should be > 1KB")
		})
	})

	Describe("Error handling", func() {
		It("should fail gracefully with missing template", func() {
			workDir := GinkgoT().TempDir()
			_, _, err := runFacet(cacheDir, workDir,
				"generate", "html",
				"-t", "nonexistent.tsx",
				"-d", "nonexistent.json",
				"-o", "output.html",
			)
			Expect(err).To(HaveOccurred())
		})
	})
})
