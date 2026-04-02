package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"

	flanksourceCtx "github.com/flanksource/commons-db/context"
	"github.com/flanksource/commons-test/helm"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

var (
	kubeconfig string
	namespace  = "facet-test"
	chart      *helm.HelmChart
	localPort  *int
	stopFwd    func()
	imageTag   = "test"
)

func findParentDir(dir string) string {
	currentDir, _ := os.Getwd()
	for {
		if _, err := os.Stat(filepath.Join(currentDir, dir)); err == nil {
			return filepath.Join(currentDir, dir)
		}
		if _, err := os.Stat(filepath.Join(currentDir, ".git")); err == nil {
			return currentDir
		}
		currentDir = filepath.Dir(currentDir)
	}
}

func findRepoRoot() string {
	currentDir, _ := os.Getwd()
	for {
		if _, err := os.Stat(filepath.Join(currentDir, "Dockerfile")); err == nil {
			return currentDir
		}
		parent := filepath.Dir(currentDir)
		if parent == currentDir {
			return ""
		}
		currentDir = parent
	}
}

func TestHelm(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "Facet Helm Chart Suite")
}

var _ = BeforeSuite(func() {
	kubeconfig = os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		kubeconfig = filepath.Join(os.Getenv("HOME"), ".kube", "config")
	}

	if stat, err := os.Stat(kubeconfig); err != nil || stat.IsDir() {
		path, _ := filepath.Abs(kubeconfig)
		Skip(fmt.Sprintf("KUBECONFIG %s is not valid, skipping helm tests", path))
	}

	if ns := os.Getenv("TEST_NAMESPACE"); ns != "" {
		namespace = ns
	}

	if tag := os.Getenv("IMAGE_TAG"); tag != "" {
		imageTag = tag
	}

	repoRoot := findRepoRoot()
	Expect(repoRoot).NotTo(BeEmpty(), "Could not find repo root with Dockerfile")

	By("Building Docker image")
	imageName := fmt.Sprintf("ghcr.io/flanksource/facet:%s", imageTag)
	cmd := exec.Command("docker", "build", "-t", imageName, repoRoot)
	cmd.Stdout = GinkgoWriter
	cmd.Stderr = GinkgoWriter
	Expect(cmd.Run()).NotTo(HaveOccurred(), "Docker build failed")

	chartPath := findParentDir("chart")
	GinkgoWriter.Printf("kubeconfig=%s namespace=%s chart=%s image=%s\n", kubeconfig, namespace, chartPath, imageName)

	ctx := flanksourceCtx.New().WithNamespace(namespace)
	chart = helm.NewHelmChart(ctx, chartPath)

	By("Installing facet chart")
	chart.Release("facet-test").
		Namespace(namespace).
		Values(map[string]any{
			"image": map[string]any{
				"tag":        imageTag,
				"pullPolicy": "Never",
			},
			"sandbox": map[string]any{
				"enabled": true,
			},
		}).
		WaitFor(3 * time.Minute)

	if err := chart.Install(); err != nil {
		Expect(chart.Upgrade()).NotTo(HaveOccurred())
	}

	By("Port-forwarding to facet pod")
	pod := chart.GetPod("app.kubernetes.io/name=facet")
	pod.WaitReady()
	Expect(pod.Error()).NotTo(HaveOccurred())

	localPort, stopFwd = pod.ForwardPort(3010)
	Expect(localPort).NotTo(BeNil())
})

var _ = AfterSuite(func() {
	if stopFwd != nil {
		stopFwd()
	}
	if chart != nil {
		chart.Delete()
	}
})
