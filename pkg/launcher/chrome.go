package launcher

import (
	"os"
	"path/filepath"
	"runtime"
)

func DetectChrome() string {
	if p := os.Getenv("PUPPETEER_EXECUTABLE_PATH"); p != "" {
		return p
	}
	if p := os.Getenv("CHROME_PATH"); p != "" {
		return p
	}

	home, _ := os.UserHomeDir()

	// Playwright cache
	for _, pattern := range playwrightPatterns(home) {
		if matches, _ := filepath.Glob(pattern); len(matches) > 0 {
			return matches[0]
		}
	}

	// System Chrome
	for _, p := range systemChromePaths() {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}

	// Puppeteer cache
	for _, pattern := range puppeteerPatterns(home) {
		if matches, _ := filepath.Glob(pattern); len(matches) > 0 {
			return matches[0]
		}
	}

	return ""
}

func playwrightPatterns(home string) []string {
	cacheDir := filepath.Join(home, ".cache", "ms-playwright")
	switch runtime.GOOS {
	case "darwin":
		return []string{
			filepath.Join(cacheDir, "chromium-*", "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
		}
	case "linux":
		return []string{
			filepath.Join(cacheDir, "chromium-*", "chrome-linux", "chrome"),
		}
	}
	return nil
}

func systemChromePaths() []string {
	switch runtime.GOOS {
	case "darwin":
		return []string{
			"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		}
	case "linux":
		return []string{
			"/usr/bin/google-chrome-stable",
			"/usr/bin/chromium-browser",
			"/usr/bin/chromium",
		}
	}
	return nil
}

func puppeteerPatterns(home string) []string {
	cacheDir := filepath.Join(home, ".cache", "puppeteer", "chrome")
	switch runtime.GOOS {
	case "darwin":
		if runtime.GOARCH == "arm64" {
			return []string{
				filepath.Join(cacheDir, "*", "chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
			}
		}
		return []string{
			filepath.Join(cacheDir, "*", "chrome-mac-x64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
		}
	case "linux":
		return []string{
			filepath.Join(cacheDir, "*", "chrome-linux64", "chrome"),
		}
	}
	return nil
}
