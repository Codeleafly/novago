package runtime

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/fatih/color"
)

type LibraryManager struct {
	BaseDir string
}

func NewLibraryManager() *LibraryManager {
	home, _ := os.UserHomeDir()
	baseDir := filepath.Join(home, ".novago_libs")
	if _, err := os.Stat(baseDir); os.IsNotExist(err) {
		os.MkdirAll(baseDir, 0755)
	}
	return &LibraryManager{BaseDir: baseDir}
}

func (lm *LibraryManager) Resolve(source string) (string, error) {
	if strings.HasPrefix(source, "go:") {
		return source, nil
	}

	if strings.HasPrefix(source, "npm:") {
		return "", fmt.Errorf("NPM modules are not supported in NovaGo. Use go: modules or native scripts.")
	}

	if strings.HasPrefix(source, "github:") {
		return lm.resolveGitHub(source)
	}

	if strings.HasPrefix(source, "https://") || strings.HasPrefix(source, "http://") {
		return lm.resolveURL(source)
	}

	return source, nil
}

func (lm *LibraryManager) resolveGitHub(source string) (string, error) {
	// github:user/repo/branch/path/to/file.ng
	parts := strings.Split(strings.TrimPrefix(source, "github:"), "/")
	if len(parts) < 2 {
		return "", fmt.Errorf("Invalid GitHub source format. Use github:user/repo/branch/file.ng")
	}

	user := parts[0]
	repo := parts[1]
	branch := "main"
	filePath := ""

	if len(parts) >= 3 {
		branch = parts[2]
		filePath = strings.Join(parts[3:], "/")
	}

	if filePath == "" {
		filePath = "index.ng"
	}

	rawURL := fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/%s/%s", user, repo, branch, filePath)
	localPath := filepath.Join(lm.BaseDir, "github.com", user, repo, branch, filePath)

	return lm.downloadFile(rawURL, localPath)
}

func (lm *LibraryManager) resolveURL(source string) (string, error) {
	fileName := filepath.Base(source)
	if !strings.HasSuffix(fileName, ".ng") {
		fileName += ".ng"
	}
	
	// Create a hash or unique path for URL
	host := "remote"
	localPath := filepath.Join(lm.BaseDir, host, fileName)

	return lm.downloadFile(source, localPath)
}

func (lm *LibraryManager) downloadFile(url string, localPath string) (string, error) {
	if _, err := os.Stat(localPath); err == nil {
		return localPath, nil
	}

	os.MkdirAll(filepath.Dir(localPath), 0755)

	color.New(color.FgCyan).Printf("⬇ Downloading %s...\n", url)

	resp, err := http.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("Failed to download file: %s (Status: %d)", url, resp.StatusCode)
	}

	out, err := os.Create(localPath)
	if err != nil {
		return "", err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return "", err
	}

	color.New(color.FgGreen).Printf("✔ Saved to %s\n", localPath)
	return localPath, nil
}

func (lm *LibraryManager) Clean() {
	err := os.RemoveAll(lm.BaseDir)
	if err == nil {
		color.New(color.FgGreen).Println("✔ Global library cache cleared.")
	} else {
		color.New(color.FgRed).Printf("✘ Failed to clear cache: %v\n", err)
	}
}
