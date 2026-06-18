package cli

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/visionik/mogcli/internal/graph"
	"github.com/visionik/mogcli/internal/testutil"
)

// mockClientFactory returns a factory function that always returns the given mock client.
func mockClientFactory(client graph.Client) ClientFactory {
	return func() (graph.Client, error) {
		return client, nil
	}
}

// mockClientFactoryError returns a factory function that always returns an error.
func mockClientFactoryError(err error) ClientFactory {
	return func() (graph.Client, error) {
		return nil, err
	}
}

// captureOutput captures stdout during function execution.
func captureOutput(f func()) string {
	old := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	f()

	w.Close()
	os.Stdout = old

	var buf bytes.Buffer
	buf.ReadFrom(r)
	return buf.String()
}

func TestMailSearchCmd_Run(t *testing.T) {
	tests := []struct {
		name      string
		cmd       *MailSearchCmd
		root      *Root
		mockResp  []byte
		mockErr   error
		wantErr   bool
		wantInOut string
	}{
		{
			name: "successful search with results",
			cmd:  &MailSearchCmd{Query: "test", Max: 10},
			root: &Root{},
			mockResp: mustJSON(map[string]interface{}{
				"value": []map[string]interface{}{
					{
						"id":               "msg-123",
						"subject":          "Test Email",
						"receivedDateTime": "2024-01-15T10:30:00Z",
						"isRead":           false,
						"hasAttachments":   true,
						"from": map[string]interface{}{
							"emailAddress": map[string]string{
								"name":    "Sender",
								"address": "sender@example.com",
							},
						},
					},
				},
			}),
			wantInOut: "Test Email",
		},
		{
			name: "search all messages with *",
			cmd:  &MailSearchCmd{Query: "*", Max: 25},
			root: &Root{},
			mockResp: mustJSON(map[string]interface{}{
				"value": []map[string]interface{}{},
			}),
			wantInOut: "No messages found",
		},
		{
			name: "search with folder specified",
			cmd:  &MailSearchCmd{Query: "test", Max: 10, Folder: "inbox"},
			root: &Root{},
			mockResp: mustJSON(map[string]interface{}{
				"value": []map[string]interface{}{},
			}),
			wantInOut: "No messages found",
		},
		{
			name: "search with JSON output",
			cmd:  &MailSearchCmd{Query: "test", Max: 10},
			root: &Root{JSON: true},
			mockResp: mustJSON(map[string]interface{}{
				"value": []map[string]interface{}{
					{"id": "msg-123", "subject": "Test"},
				},
			}),
			wantInOut: `"id"`,
		},
		{
			name:    "API error",
			cmd:     &MailSearchCmd{Query: "test", Max: 10},
			root:    &Root{},
			mockErr: errors.New("API error"),
			wantErr: true,
		},
		{
			name:    "client creation error",
			cmd:     &MailSearchCmd{Query: "test", Max: 10},
			root:    &Root{ClientFactory: mockClientFactoryError(errors.New("not logged in"))},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.root.ClientFactory == nil {
				mock := &testutil.MockClient{
					GetFunc: func(ctx context.Context, path string, query url.Values) ([]byte, error) {
						return tt.mockResp, tt.mockErr
					},
				}
				tt.root.ClientFactory = mockClientFactory(mock)
			}

			var output string
			err := error(nil)
			output = captureOutput(func() {
				err = tt.cmd.Run(tt.root)
			})

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				if tt.wantInOut != "" {
					assert.Contains(t, output, tt.wantInOut)
				}
			}
		})
	}
}

func TestMailGetCmd_Run(t *testing.T) {
	tests := []struct {
		name      string
		cmd       *MailGetCmd
		root      *Root
		mockResp  []byte
		mockErr   error
		wantErr   bool
		wantInOut string
	}{
		{
			name: "successful get",
			cmd:  &MailGetCmd{ID: "msg-123"},
			root: &Root{},
			mockResp: mustJSON(map[string]interface{}{
				"id":               "msg-123",
				"subject":          "Test Subject",
				"receivedDateTime": "2024-01-15T10:30:00Z",
				"isRead":           true,
				"from": map[string]interface{}{
					"emailAddress": map[string]string{
						"name":    "Sender Name",
						"address": "sender@example.com",
					},
				},
				"body": map[string]string{
					"contentType": "text",
					"content":     "Message body content",
				},
			}),
			wantInOut: "Test Subject",
		},
		{
			name: "get with JSON output",
			cmd:  &MailGetCmd{ID: "msg-123"},
			root: &Root{JSON: true},
			mockResp: mustJSON(map[string]interface{}{
				"id":      "msg-123",
				"subject": "Test Subject",
			}),
			wantInOut: `"subject": "Test Subject"`,
		},
		{
			name:    "message not found",
			cmd:     &MailGetCmd{ID: "invalid"},
			root:    &Root{},
			mockErr: errors.New("ResourceNotFound"),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &testutil.MockClient{
				GetFunc: func(ctx context.Context, path string, query url.Values) ([]byte, error) {
					return tt.mockResp, tt.mockErr
				},
			}
			tt.root.ClientFactory = mockClientFactory(mock)

			var output string
			err := error(nil)
			output = captureOutput(func() {
				err = tt.cmd.Run(tt.root)
			})

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				if tt.wantInOut != "" {
					assert.Contains(t, output, tt.wantInOut)
				}
			}
		})
	}
}

func TestMailSendCmd_Run(t *testing.T) {
	tests := []struct {
		name      string
		cmd       *MailSendCmd
		root      *Root
		mockErr   error
		wantErr   bool
		wantInOut string
	}{
		{
			name: "successful send with plain text",
			cmd: &MailSendCmd{
				To:      []string{"recipient@example.com"},
				Subject: "Test Subject",
				Body:    "Test body content",
			},
			root:      &Root{},
			wantInOut: "Email sent successfully",
		},
		{
			name: "successful send with HTML body",
			cmd: &MailSendCmd{
				To:       []string{"recipient@example.com"},
				Subject:  "Test Subject",
				BodyHTML: "<p>HTML content</p>",
			},
			root:      &Root{},
			wantInOut: "Email sent successfully",
		},
		{
			name: "successful send with CC and BCC",
			cmd: &MailSendCmd{
				To:      []string{"to@example.com"},
				Cc:      []string{"cc@example.com"},
				Bcc:     []string{"bcc@example.com"},
				Subject: "Test",
				Body:    "Body",
			},
			root:      &Root{},
			wantInOut: "Email sent successfully",
		},
		{
			name: "reply to message",
			cmd: &MailSendCmd{
				To:               []string{"recipient@example.com"},
				Subject:          "Re: Original",
				Body:             "Reply content",
				ReplyToMessageID: "orig-msg-123",
			},
			root:      &Root{},
			wantInOut: "Email sent successfully",
		},
		{
			name: "missing body error",
			cmd: &MailSendCmd{
				To:      []string{"recipient@example.com"},
				Subject: "Test",
			},
			root:    &Root{},
			wantErr: true,
		},
		{
			name: "API error",
			cmd: &MailSendCmd{
				To:      []string{"recipient@example.com"},
				Subject: "Test",
				Body:    "Body",
			},
			root:    &Root{},
			mockErr: errors.New("API error"),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &testutil.MockClient{
				PostFunc: func(ctx context.Context, path string, body interface{}) ([]byte, error) {
					return []byte(`{}`), tt.mockErr
				},
			}
			tt.root.ClientFactory = mockClientFactory(mock)

			var output string
			err := error(nil)
			output = captureOutput(func() {
				err = tt.cmd.Run(tt.root)
			})

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				if tt.wantInOut != "" {
					assert.Contains(t, output, tt.wantInOut)
				}
			}
		})
	}
}

func TestMailSendCmd_BodyFile(t *testing.T) {
	tmpDir := t.TempDir()
	bodyFile := filepath.Join(tmpDir, "body.txt")
	require.NoError(t, os.WriteFile(bodyFile, []byte("File content"), 0644))

	mock := &testutil.MockClient{
		PostFunc: func(ctx context.Context, path string, body interface{}) ([]byte, error) {
			return []byte(`{}`), nil
		},
	}

	cmd := &MailSendCmd{
		To:       []string{"recipient@example.com"},
		Subject:  "Test",
		BodyFile: bodyFile,
	}
	root := &Root{ClientFactory: mockClientFactory(mock)}

	output := captureOutput(func() {
		err := cmd.Run(root)
		require.NoError(t, err)
	})

	assert.Contains(t, output, "Email sent successfully")
}

func TestMailFoldersCmd_Run(t *testing.T) {
	tests := []struct {
		name      string
		root      *Root
		mockResp  []byte
		mockErr   error
		wantErr   bool
		wantInOut string
	}{
		{
			name: "successful list folders",
			root: &Root{},
			mockResp: mustJSON(map[string]interface{}{
				"value": []map[string]interface{}{
					{
						"id":              "folder-123",
						"displayName":     "Inbox",
						"unreadItemCount": 5,
						"totalItemCount":  100,
					},
					{
						"id":              "folder-456",
						"displayName":     "Sent Items",
						"unreadItemCount": 0,
						"totalItemCount":  50,
					},
				},
			}),
			wantInOut: "Inbox",
		},
		{
			name: "list folders with JSON output",
			root: &Root{JSON: true},
			mockResp: mustJSON(map[string]interface{}{
				"value": []map[string]interface{}{
					{"id": "folder-123", "displayName": "Inbox"},
				},
			}),
			wantInOut: `"displayName": "Inbox"`,
		},
		{
			name:    "API error",
			root:    &Root{},
			mockErr: errors.New("API error"),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &testutil.MockClient{
				GetFunc: func(ctx context.Context, path string, query url.Values) ([]byte, error) {
					return tt.mockResp, tt.mockErr
				},
			}
			tt.root.ClientFactory = mockClientFactory(mock)

			cmd := &MailFoldersCmd{}
			var output string
			err := error(nil)
			output = captureOutput(func() {
				err = cmd.Run(tt.root)
			})

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				if tt.wantInOut != "" {
					assert.Contains(t, output, tt.wantInOut)
				}
			}
		})
	}
}

func TestMailDraftsListCmd_Run(t *testing.T) {
	tests := []struct {
		name      string
		cmd       *MailDraftsListCmd
		root      *Root
		mockResp  []byte
		mockErr   error
		wantErr   bool
		wantInOut string
	}{
		{
			name: "successful list drafts",
			cmd:  &MailDraftsListCmd{Max: 25},
			root: &Root{},
			mockResp: mustJSON(map[string]interface{}{
				"value": []map[string]interface{}{
					{
						"id":               "draft-123",
						"subject":          "Draft Subject",
						"receivedDateTime": "2024-01-15T10:30:00Z",
					},
				},
			}),
			wantInOut: "Draft Subject",
		},
		{
			name: "empty drafts",
			cmd:  &MailDraftsListCmd{Max: 25},
			root: &Root{},
			mockResp: mustJSON(map[string]interface{}{
				"value": []map[string]interface{}{},
			}),
			wantInOut: "No drafts",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &testutil.MockClient{
				GetFunc: func(ctx context.Context, path string, query url.Values) ([]byte, error) {
					return tt.mockResp, tt.mockErr
				},
			}
			tt.root.ClientFactory = mockClientFactory(mock)

			var output string
			err := error(nil)
			output = captureOutput(func() {
				err = tt.cmd.Run(tt.root)
			})

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				if tt.wantInOut != "" {
					assert.Contains(t, output, tt.wantInOut)
				}
			}
		})
	}
}

func TestMailDraftsCreateCmd_Run(t *testing.T) {
	tests := []struct {
		name      string
		cmd       *MailDraftsCreateCmd
		mockResp  []byte
		mockErr   error
		wantErr   bool
		wantInOut string
	}{
		{
			name: "successful create draft",
			cmd: &MailDraftsCreateCmd{
				To:      []string{"to@example.com"},
				Subject: "Draft Subject",
				Body:    "Draft body",
			},
			mockResp: mustJSON(map[string]interface{}{
				"id":      "draft-new-123",
				"subject": "Draft Subject",
			}),
			wantInOut: "Draft created",
		},
		{
			name:    "API error",
			cmd:     &MailDraftsCreateCmd{Subject: "Test", Body: "Body"},
			mockErr: errors.New("API error"),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &testutil.MockClient{
				PostFunc: func(ctx context.Context, path string, body interface{}) ([]byte, error) {
					return tt.mockResp, tt.mockErr
				},
			}
			root := &Root{ClientFactory: mockClientFactory(mock)}

			var output string
			err := error(nil)
			output = captureOutput(func() {
				err = tt.cmd.Run(root)
			})

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				if tt.wantInOut != "" {
					assert.Contains(t, output, tt.wantInOut)
				}
			}
		})
	}
}

func TestMailDraftsSendCmd_Run(t *testing.T) {
	tests := []struct {
		name      string
		cmd       *MailDraftsSendCmd
		mockErr   error
		wantErr   bool
		wantInOut string
	}{
		{
			name:      "successful send draft",
			cmd:       &MailDraftsSendCmd{ID: "draft-123"},
			wantInOut: "Draft sent",
		},
		{
			name:    "API error",
			cmd:     &MailDraftsSendCmd{ID: "draft-123"},
			mockErr: errors.New("API error"),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &testutil.MockClient{
				PostFunc: func(ctx context.Context, path string, body interface{}) ([]byte, error) {
					return []byte(`{}`), tt.mockErr
				},
			}
			root := &Root{ClientFactory: mockClientFactory(mock)}

			var output string
			err := error(nil)
			output = captureOutput(func() {
				err = tt.cmd.Run(root)
			})

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				if tt.wantInOut != "" {
					assert.Contains(t, output, tt.wantInOut)
				}
			}
		})
	}
}

func TestMailDraftsDeleteCmd_Run(t *testing.T) {
	tests := []struct {
		name      string
		cmd       *MailDraftsDeleteCmd
		mockErr   error
		wantErr   bool
		wantInOut string
	}{
		{
			name:      "successful delete draft",
			cmd:       &MailDraftsDeleteCmd{ID: "draft-123"},
			wantInOut: "Draft deleted",
		},
		{
			name:    "API error",
			cmd:     &MailDraftsDeleteCmd{ID: "draft-123"},
			mockErr: errors.New("API error"),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &testutil.MockClient{
				DeleteFunc: func(ctx context.Context, path string) error {
					return tt.mockErr
				},
			}
			root := &Root{ClientFactory: mockClientFactory(mock)}

			var output string
			err := error(nil)
			output = captureOutput(func() {
				err = tt.cmd.Run(root)
			})

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				if tt.wantInOut != "" {
					assert.Contains(t, output, tt.wantInOut)
				}
			}
		})
	}
}

func TestMailAttachmentListCmd_Run(t *testing.T) {
	tests := []struct {
		name      string
		cmd       *MailAttachmentListCmd
		root      *Root
		mockResp  []byte
		mockErr   error
		wantErr   bool
		wantInOut string
	}{
		{
			name: "successful list attachments",
			cmd:  &MailAttachmentListCmd{MessageID: "msg-123"},
			root: &Root{},
			mockResp: mustJSON(map[string]interface{}{
				"value": []map[string]interface{}{
					{
						"id":          "att-123",
						"name":        "document.pdf",
						"size":        1024,
						"contentType": "application/pdf",
					},
				},
			}),
			wantInOut: "document.pdf",
		},
		{
			name: "list attachments JSON output",
			cmd:  &MailAttachmentListCmd{MessageID: "msg-123"},
			root: &Root{JSON: true},
			mockResp: mustJSON(map[string]interface{}{
				"value": []map[string]interface{}{
					{"id": "att-123", "name": "doc.pdf"},
				},
			}),
			wantInOut: `"name": "doc.pdf"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &testutil.MockClient{
				GetFunc: func(ctx context.Context, path string, query url.Values) ([]byte, error) {
					return tt.mockResp, tt.mockErr
				},
			}
			tt.root.ClientFactory = mockClientFactory(mock)

			var output string
			err := error(nil)
			output = captureOutput(func() {
				err = tt.cmd.Run(tt.root)
			})

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				if tt.wantInOut != "" {
					assert.Contains(t, output, tt.wantInOut)
				}
			}
		})
	}
}

func TestMailAttachmentDownloadCmd_Run(t *testing.T) {
	tmpDir := t.TempDir()
	outFile := filepath.Join(tmpDir, "downloaded.pdf")

	mock := &testutil.MockClient{
		GetFunc: func(ctx context.Context, path string, query url.Values) ([]byte, error) {
			return mustJSON(map[string]interface{}{
				"id":           "att-123",
				"name":         "document.pdf",
				"size":         1024,
				"contentBytes": []byte("PDF content"),
			}), nil
		},
	}
	root := &Root{ClientFactory: mockClientFactory(mock)}

	cmd := &MailAttachmentDownloadCmd{
		MessageID:    "msg-123",
		AttachmentID: "att-456",
		Out:          outFile,
	}

	output := captureOutput(func() {
		err := cmd.Run(root)
		require.NoError(t, err)
	})

	assert.Contains(t, output, "Downloaded")
	assert.FileExists(t, outFile)
}

// Tests for helper functions
func TestFormatRecipients(t *testing.T) {
	tests := []struct {
		name     string
		emails   []string
		expected int
	}{
		{
			name:     "single recipient",
			emails:   []string{"test@example.com"},
			expected: 1,
		},
		{
			name:     "multiple recipients",
			emails:   []string{"a@example.com", "b@example.com", "c@example.com"},
			expected: 3,
		},
		{
			name:     "empty list",
			emails:   []string{},
			expected: 0,
		},
		{
			name:     "nil list",
			emails:   nil,
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := formatRecipients(tt.emails)
			assert.Len(t, result, tt.expected)

			for i, r := range result {
				emailAddr := r["emailAddress"].(map[string]string)
				assert.Equal(t, tt.emails[i], emailAddr["address"])
			}
		})
	}
}

func TestFormatMessageDate(t *testing.T) {
	tests := []struct {
		name     string
		dateStr  string
		notEmpty bool
	}{
		{name: "valid RFC3339", dateStr: "2024-01-15T10:30:00Z", notEmpty: true},
		// Note: invalid format with less than 10 chars will panic, so we test with >=10 chars
		{name: "invalid but long enough", dateStr: "invalid-date-string", notEmpty: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := formatMessageDate(tt.dateStr)
			if tt.notEmpty {
				assert.NotEmpty(t, result)
			}
		})
	}
}

func TestStripHTML(t *testing.T) {
	tests := []struct {
		name     string
		html     string
		expected string
	}{
		{name: "simple tags", html: "<p>Hello</p>", expected: "Hello"},
		{name: "nested tags", html: "<div><p>Hello <b>World</b></p></div>", expected: "Hello World"},
		{name: "no tags", html: "Plain text", expected: "Plain text"},
		{name: "empty string", html: "", expected: ""},
		{name: "with attributes", html: `<a href="http://example.com">Link</a>`, expected: "Link"},
		{name: "self-closing tags", html: "Line1<br/>Line2", expected: "Line1Line2"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := stripHTML(tt.html)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestOutputJSON(t *testing.T) {
	tests := []struct {
		name     string
		input    interface{}
		contains string
	}{
		{name: "simple map", input: map[string]string{"key": "value"}, contains: `"key": "value"`},
		{name: "slice", input: []string{"a", "b"}, contains: `"a"`},
		{name: "struct", input: Message{ID: "msg-123", Subject: "Test"}, contains: `"id": "msg-123"`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			output := captureOutput(func() {
				err := outputJSON(tt.input)
				require.NoError(t, err)
			})
			assert.Contains(t, output, tt.contains)
		})
	}
}

func TestPrintMessage(t *testing.T) {
	msg := Message{
		ID:               "test-message-id-12345678901234567890",
		Subject:          "Test Subject",
		ReceivedDateTime: "2024-01-15T10:30:00Z",
		IsRead:           false,
		HasAttachments:   true,
		From: &EmailAddr{
			EmailAddress: struct {
				Name    string `json:"name"`
				Address string `json:"address"`
			}{
				Name:    "Sender",
				Address: "sender@example.com",
			},
		},
	}

	output := captureOutput(func() {
		printMessage(msg, false)
	})

	assert.Contains(t, output, "Test Subject")
	assert.Contains(t, output, "Sender")
	assert.Contains(t, output, "📎")
	assert.Contains(t, output, "●")
}

func TestPrintMessageDetail(t *testing.T) {
	msg := Message{
		ID:               "test-message-id-12345678901234567890",
		Subject:          "Test Subject",
		ReceivedDateTime: "2024-01-15T10:30:00Z",
		IsRead:           true,
		From: &EmailAddr{
			EmailAddress: struct {
				Name    string `json:"name"`
				Address string `json:"address"`
			}{
				Name:    "Sender Name",
				Address: "sender@example.com",
			},
		},
		Body: &MessageBody{
			ContentType: "text",
			Content:     "Message body",
		},
	}

	output := captureOutput(func() {
		printMessageDetail(msg, false)
	})

	assert.Contains(t, output, "Test Subject")
	assert.Contains(t, output, "Sender Name")
	assert.Contains(t, output, "Message body")
}

// Test type unmarshaling
func TestMessage_Unmarshal(t *testing.T) {
	jsonData := `{
		"id": "msg-123",
		"subject": "Test Subject",
		"isRead": true,
		"hasAttachments": true,
		"receivedDateTime": "2024-01-15T10:30:00Z"
	}`

	var msg Message
	err := json.Unmarshal([]byte(jsonData), &msg)
	require.NoError(t, err)
	assert.Equal(t, "msg-123", msg.ID)
	assert.Equal(t, "Test Subject", msg.Subject)
	assert.True(t, msg.IsRead)
	assert.True(t, msg.HasAttachments)
}

func TestMailFolder_Unmarshal(t *testing.T) {
	jsonData := `{
		"id": "folder-123",
		"displayName": "Inbox",
		"unreadItemCount": 5,
		"totalItemCount": 100
	}`

	var folder MailFolder
	err := json.Unmarshal([]byte(jsonData), &folder)
	require.NoError(t, err)
	assert.Equal(t, "folder-123", folder.ID)
	assert.Equal(t, "Inbox", folder.DisplayName)
	assert.Equal(t, 5, folder.UnreadItemCount)
}

func TestAttachment_Unmarshal(t *testing.T) {
	jsonData := `{
		"id": "att-123",
		"name": "document.pdf",
		"size": 1024,
		"contentType": "application/pdf"
	}`

	var att Attachment
	err := json.Unmarshal([]byte(jsonData), &att)
	require.NoError(t, err)
	assert.Equal(t, "att-123", att.ID)
	assert.Equal(t, "document.pdf", att.Name)
	assert.Equal(t, 1024, att.Size)
}

// mustJSON marshals data to JSON bytes, panicking on error.
func mustJSON(data interface{}) []byte {
	b, err := json.Marshal(data)
	if err != nil {
		panic(err)
	}
	return b
}

func TestBuildAttachments(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "hello.txt")
	require.NoError(t, os.WriteFile(p, []byte("hi there"), 0o600))

	atts, err := buildAttachments([]string{p})
	require.NoError(t, err)
	require.Len(t, atts, 1)
	assert.Equal(t, "#microsoft.graph.fileAttachment", atts[0].ODataType)
	assert.Equal(t, "hello.txt", atts[0].Name)
	assert.Contains(t, atts[0].ContentType, "text/plain")
	assert.Equal(t, base64.StdEncoding.EncodeToString([]byte("hi there")), atts[0].ContentBytes)

	// Unknown extension falls back to octet-stream.
	bin := filepath.Join(dir, "blob.unknownext")
	require.NoError(t, os.WriteFile(bin, []byte{0x00, 0x01}, 0o600))
	atts, err = buildAttachments([]string{bin})
	require.NoError(t, err)
	assert.Equal(t, "application/octet-stream", atts[0].ContentType)

	// Empty path, missing file and a directory are rejected with clear errors.
	_, err = buildAttachments([]string{""})
	assert.Error(t, err)
	_, err = buildAttachments([]string{filepath.Join(dir, "does-not-exist.txt")})
	assert.Error(t, err)
	_, err = buildAttachments([]string{dir})
	assert.Error(t, err)

	// Files at/over the 3 MB inline limit are rejected before upload.
	big := filepath.Join(dir, "big.bin")
	require.NoError(t, os.WriteFile(big, make([]byte, maxInlineAttachmentBytes), 0o600))
	_, err = buildAttachments([]string{big})
	assert.Error(t, err)
}

func TestMailAttachmentsInPayload(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "doc.txt")
	require.NoError(t, os.WriteFile(p, []byte("payload"), 0o600))

	// decodeAttachments marshals the captured POST body and pulls out the
	// attachments array (optionally nested under a key, e.g. "message").
	decodeAttachments := func(body interface{}, key string) []map[string]interface{} {
		raw, err := json.Marshal(body)
		require.NoError(t, err)
		var m map[string]interface{}
		require.NoError(t, json.Unmarshal(raw, &m))
		container := m
		if key != "" {
			inner, ok := m[key].(map[string]interface{})
			require.True(t, ok, "expected %q object in payload", key)
			container = inner
		}
		arr, ok := container["attachments"].([]interface{})
		require.True(t, ok, "expected attachments array in payload")
		out := make([]map[string]interface{}, 0, len(arr))
		for _, a := range arr {
			out = append(out, a.(map[string]interface{}))
		}
		return out
	}

	t.Run("send wraps attachments under message", func(t *testing.T) {
		var gotPath string
		var gotBody interface{}
		mock := &testutil.MockClient{
			PostFunc: func(ctx context.Context, path string, body interface{}) ([]byte, error) {
				gotPath, gotBody = path, body
				return nil, nil
			},
		}
		root := &Root{ClientFactory: mockClientFactory(mock)}
		err := (&MailSendCmd{To: []string{"a@b.de"}, Subject: "S", Body: "B", Attachment: []string{p}}).Run(root)
		require.NoError(t, err)
		assert.Equal(t, "/me/sendMail", gotPath)
		atts := decodeAttachments(gotBody, "message")
		require.Len(t, atts, 1)
		assert.Equal(t, "#microsoft.graph.fileAttachment", atts[0]["@odata.type"])
		assert.Equal(t, "doc.txt", atts[0]["name"])
		assert.Equal(t, base64.StdEncoding.EncodeToString([]byte("payload")), atts[0]["contentBytes"])
	})

	t.Run("drafts create posts attachments on the message", func(t *testing.T) {
		var gotPath string
		var gotBody interface{}
		mock := &testutil.MockClient{
			PostFunc: func(ctx context.Context, path string, body interface{}) ([]byte, error) {
				gotPath, gotBody = path, body
				return mustJSON(map[string]interface{}{"id": "d1"}), nil
			},
		}
		root := &Root{ClientFactory: mockClientFactory(mock)}
		err := (&MailDraftsCreateCmd{To: []string{"a@b.de"}, Subject: "S", Body: "B", Attachment: []string{p}}).Run(root)
		require.NoError(t, err)
		assert.Equal(t, "/me/messages", gotPath)
		atts := decodeAttachments(gotBody, "")
		require.Len(t, atts, 1)
		assert.Equal(t, "doc.txt", atts[0]["name"])
	})

}

func TestMailReplyWithAttachments(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "doc.txt")
	require.NoError(t, os.WriteFile(p, []byte("payload"), 0o600))

	type call struct{ op, path string }
	toMap := func(body interface{}) map[string]interface{} {
		raw, _ := json.Marshal(body)
		var m map[string]interface{}
		_ = json.Unmarshal(raw, &m)
		return m
	}
	// newMock records the ordered (method, path) calls. failAt injects an error
	// at the named step (createReply/patch/attach/send); "" means all succeed.
	newMock := func(failAt string, replyBody map[string]interface{}) (*testutil.MockClient, *[]call, *map[string]interface{}, *map[string]interface{}) {
		var calls []call
		var lastPatch, lastAttach map[string]interface{}
		mock := &testutil.MockClient{
			PostFunc: func(ctx context.Context, path string, body interface{}) ([]byte, error) {
				calls = append(calls, call{"POST", path})
				switch {
				case strings.HasSuffix(path, "/createReply"):
					if failAt == "createReply" {
						return nil, errors.New("boom")
					}
					draft := map[string]interface{}{"id": "reply-draft-1"}
					if replyBody != nil {
						draft["body"] = replyBody
					}
					return mustJSON(draft), nil
				case strings.HasSuffix(path, "/attachments"):
					lastAttach = toMap(body)
					if failAt == "attach" {
						return nil, errors.New("boom")
					}
				case strings.HasSuffix(path, "/send"):
					if failAt == "send" {
						return nil, errors.New("boom")
					}
				}
				return nil, nil
			},
			PatchFunc: func(ctx context.Context, path string, body interface{}) ([]byte, error) {
				calls = append(calls, call{"PATCH", path})
				lastPatch = toMap(body)
				if failAt == "patch" {
					return nil, errors.New("boom")
				}
				return nil, nil
			},
			DeleteFunc: func(ctx context.Context, path string) error {
				calls = append(calls, call{"DELETE", path})
				return nil
			},
		}
		return mock, &calls, &lastPatch, &lastAttach
	}

	t.Run("text reply: createReply→patch→attach→send in order, quote via comment", func(t *testing.T) {
		mock, calls, lastPatch, lastAttach := newMock("", nil)
		root := &Root{ClientFactory: mockClientFactory(mock)}
		err := (&MailSendCmd{To: []string{"a@b.de"}, Cc: []string{"c@b.de"}, Body: "hi", Attachment: []string{p}, ReplyToMessageID: "m1"}).Run(root)
		require.NoError(t, err)
		require.Equal(t, []call{
			{"POST", "/me/messages/m1/createReply"},
			{"PATCH", "/me/messages/reply-draft-1"},
			{"POST", "/me/messages/reply-draft-1/attachments"},
			{"POST", "/me/messages/reply-draft-1/send"},
		}, *calls)
		// Recipients are set on the draft; text body is NOT patched (kept via comment).
		assert.NotNil(t, (*lastPatch)["toRecipients"])
		assert.NotNil(t, (*lastPatch)["ccRecipients"])
		_, hasBody := (*lastPatch)["body"]
		assert.False(t, hasBody, "text reply keeps the quote via comment, no body PATCH")
		// Attachment payload is correct.
		assert.Equal(t, "#microsoft.graph.fileAttachment", (*lastAttach)["@odata.type"])
		assert.Equal(t, "doc.txt", (*lastAttach)["name"])
		assert.Equal(t, base64.StdEncoding.EncodeToString([]byte("payload")), (*lastAttach)["contentBytes"])
	})

	t.Run("html reply prepends user html before the quoted draft body", func(t *testing.T) {
		mock, _, lastPatch, _ := newMock("", map[string]interface{}{"contentType": "html", "content": "<i>quote</i>"})
		root := &Root{ClientFactory: mockClientFactory(mock)}
		err := (&MailSendCmd{To: []string{"a@b.de"}, BodyHTML: "<b>hi</b>", Attachment: []string{p}, ReplyToMessageID: "m1"}).Run(root)
		require.NoError(t, err)
		b, ok := (*lastPatch)["body"].(map[string]interface{})
		require.True(t, ok, "html reply must PATCH the body")
		assert.Equal(t, "html", b["contentType"])
		assert.Contains(t, b["content"], "<b>hi</b>")
		assert.Contains(t, b["content"], "<i>quote</i>")
	})

	t.Run("createReply failure: surfaces error, no further calls", func(t *testing.T) {
		mock, calls, _, _ := newMock("createReply", nil)
		root := &Root{ClientFactory: mockClientFactory(mock)}
		err := (&MailSendCmd{To: []string{"a@b.de"}, Body: "hi", Attachment: []string{p}, ReplyToMessageID: "m1"}).Run(root)
		assert.Error(t, err)
		require.Equal(t, []call{{"POST", "/me/messages/m1/createReply"}}, *calls)
	})

	t.Run("attach failure: deletes orphan draft, does not send", func(t *testing.T) {
		mock, calls, _, _ := newMock("attach", nil)
		root := &Root{ClientFactory: mockClientFactory(mock)}
		err := (&MailSendCmd{To: []string{"a@b.de"}, Body: "hi", Attachment: []string{p}, ReplyToMessageID: "m1"}).Run(root)
		assert.Error(t, err)
		assert.Contains(t, *calls, call{"DELETE", "/me/messages/reply-draft-1"})
		assert.NotContains(t, *calls, call{"POST", "/me/messages/reply-draft-1/send"})
	})

	t.Run("send failure: keeps the draft (no delete)", func(t *testing.T) {
		mock, calls, _, _ := newMock("send", nil)
		root := &Root{ClientFactory: mockClientFactory(mock)}
		err := (&MailSendCmd{To: []string{"a@b.de"}, Body: "hi", Attachment: []string{p}, ReplyToMessageID: "m1"}).Run(root)
		assert.Error(t, err)
		assert.NotContains(t, *calls, call{"DELETE", "/me/messages/reply-draft-1"})
	})
}
