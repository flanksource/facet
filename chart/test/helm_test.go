package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

var _ = Describe("Facet", Ordered, FlakeAttempts(3), func() {

	Context("Chart Installation", func() {
		It("should be deployed", func() {
			status, err := chart.GetStatus()
			Expect(err).NotTo(HaveOccurred())
			Expect(status.Info.Status).To(Equal("deployed"))
		})
	})

	Context("ConfigMap", func() {
		It("should create srt-settings ConfigMap", func() {
			cm := chart.GetConfigMap("facet-test-srt-settings")
			val, err := cm.Get("srt-settings.json")
			Expect(err).NotTo(HaveOccurred())
			Expect(val).NotTo(BeEmpty())

			var settings map[string]any
			Expect(json.Unmarshal([]byte(val), &settings)).NotTo(HaveOccurred())
			Expect(settings).To(HaveKey("enableWeakerNestedSandbox"))
			Expect(settings).To(HaveKey("network"))
			Expect(settings).To(HaveKey("filesystem"))
		})
	})

	Context("Health", func() {
		It("should respond on /healthz", func() {
			resp, err := http.Get(fmt.Sprintf("http://localhost:%d/healthz", *localPort))
			Expect(err).NotTo(HaveOccurred())
			defer resp.Body.Close()
			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			body, err := io.ReadAll(resp.Body)
			Expect(err).NotTo(HaveOccurred())
			Expect(string(body)).To(ContainSubstring("ok"))
		})
	})

	Context("Render", func() {
		It("should accept render requests", func() {
			payload := `{"template":"SimpleReport","format":"html","data":{"title":"Test Report"}}`
			client := &http.Client{Timeout: 120 * time.Second}
			resp, err := client.Post(
				fmt.Sprintf("http://localhost:%d/render", *localPort),
				"application/json",
				strings.NewReader(payload),
			)
			Expect(err).NotTo(HaveOccurred())
			defer resp.Body.Close()

			body, _ := io.ReadAll(resp.Body)
			GinkgoWriter.Printf("Render response (%d): %s\n", resp.StatusCode, string(body))
			Expect(resp.StatusCode).To(BeNumerically("<", 500), "Server error: %s", string(body))
		})
	})

	Context("Sandbox Disabled", func() {
		It("should work without sandbox", func() {
			By("Upgrading chart with sandbox disabled")
			chart.SetValue("sandbox.enabled", false)
			Expect(chart.Upgrade()).NotTo(HaveOccurred())

			By("Verifying ConfigMap is gone")
			cm := chart.GetConfigMap("facet-test-srt-settings")
			_, err := cm.Get("srt-settings.json")
			Expect(err).To(HaveOccurred())

			By("Verifying healthz still works")
			pod := chart.GetPod("app.kubernetes.io/name=facet")
			pod.WaitReady()
			Expect(pod.Error()).NotTo(HaveOccurred())

			newPort, newStop := pod.ForwardPort(3010)
			Expect(newPort).NotTo(BeNil())
			defer newStop()

			resp, err := http.Get(fmt.Sprintf("http://localhost:%d/healthz", *newPort))
			Expect(err).NotTo(HaveOccurred())
			defer resp.Body.Close()
			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			By("Re-enabling sandbox for cleanup")
			chart.SetValue("sandbox.enabled", true)
			Expect(chart.Upgrade()).NotTo(HaveOccurred())
		})
	})
})
