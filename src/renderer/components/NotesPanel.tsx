interface NotesPanelProps {
  noteText: string
  setNoteText: (t: string) => void
  noteFiles: string[]
  selectedNote: string
  noteContent: string
  onSaveNote: () => void
  onLoadNote: (filename: string) => void
  onOpenNotesFolder: () => void
  onRefreshNotes: () => void
}

export default function NotesPanel({
  noteText,
  setNoteText,
  noteFiles,
  selectedNote,
  noteContent,
  onSaveNote,
  onLoadNote,
  onOpenNotesFolder,
  onRefreshNotes
}: NotesPanelProps) {
  return (
    <div className="notes-panel">
      <div className="notes-input-section">
        <textarea
          className="note-input"
          placeholder="Type a note..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={3}
        />
        <div className="notes-actions">
          <button className="action-btn primary" onClick={onSaveNote}>
            💾 Save Note
          </button>
          <button className="action-btn" onClick={onOpenNotesFolder}>
            📂 Open Folder
          </button>
          <button className="action-btn" onClick={onRefreshNotes}>
            🔄
          </button>
        </div>
      </div>

      <div className="notes-list-section">
        <h4>Saved Notes</h4>
        {noteFiles.length === 0 ? (
          <div className="empty-state">
            <p className="hint">No notes yet</p>
          </div>
        ) : (
          <div className="notes-file-list">
            {noteFiles.map((file) => (
              <button
                key={file}
                className={`note-file-btn ${selectedNote === file ? 'active' : ''}`}
                onClick={() => onLoadNote(file)}
              >
                📄 {file.replace('.md', '')}
              </button>
            ))}
          </div>
        )}
      </div>

      {noteContent && (
        <div className="note-preview">
          <h4>{selectedNote}</h4>
          <div className="note-content-scroll">
            <pre className="note-content-text">{noteContent}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
