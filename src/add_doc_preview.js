const fs = require('fs');
const file = 'C:/admin fnt/Admin/src/app/approveseller.tsx';
let content = fs.readFileSync(file, 'utf8');

const stateInjection = `  const [deleteReason, setDeleteReason] = useState("");
  // --- DOCUMENT PREVIEW STATE ---
  const [previewDoc, setPreviewDoc] = useState<{name: string, url: string} | null>(null);`;

content = content.replace('  const [deleteReason, setDeleteReason] = useState("");', stateInjection);

const buttonReplace = `onPress={() => setPreviewDoc({ name: docName, url: 'https://via.placeholder.com/800x600.png?text=' + encodeURIComponent(docName) })}`;
content = content.replace(/onPress=\{.*Alert\.alert\("Document View", `Opening preview for \$\{docName\}\.\.\.`\)\}/, buttonReplace);

const modalInjection = `      {/* --- DOCUMENT PREVIEW MODAL --- */}
      {previewDoc && (
        <Modal
          visible={!!previewDoc}
          onRequestClose={() => setPreviewDoc(null)}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: '80%', maxWidth: 800, padding: 0 }]}>
              <View style={[styles.modalHeader, { padding: 20 }]}>
                <Text style={styles.modalTitle}>{previewDoc.name} Preview</Text>
                <TouchableOpacity onPress={() => setPreviewDoc(null)}>
                  <Feather name="x" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={{ width: '100%', height: 500, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                <Image 
                  source={{ uri: previewDoc.url }} 
                  style={{ width: '100%', height: '100%', resizeMode: 'contain' }} 
                />
              </View>
              <View style={[styles.modalFooterActions, { padding: 20 }]}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancelBtn]}
                  onPress={() => setPreviewDoc(null)}
                >
                  <Text style={styles.modalCancelBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* --- TOAST CONTAINER --- */}`;

content = content.replace('{/* --- TOAST CONTAINER --- */}', modalInjection);

fs.writeFileSync(file, content, 'utf8');
console.log('Document preview added!');
