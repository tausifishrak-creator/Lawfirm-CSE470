
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import useApi from '../hooks/useApi';
import { PageHeader, PageStatus } from '../components/ui';
import { fileSize, shortDate } from '../utils/format';

const IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif'];

function Lightbox({ src, onClose }) {
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="lightbox" onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog">
            <button type="button" className="lightbox_close" onClick={onClose} aria-label="Close">&times;</button>
            <img src={src} alt="Case document" />
        </div>
    );
}

export default function Documents() {
    const { caseId } = useParams();
    const toast = useToast();
    const { data, error, loading, reload } = useApi(`/cases/${caseId}/documents`);

    const [file, setFile] = useState(null);
    const [docType, setDocType] = useState('');
    const [busy, setBusy] = useState(false);
    const [preview, setPreview] = useState(null);
    const [savingDetails, setSavingDetails] = useState(false);
    const fileInput = useRef(null);

    const [details, setDetails] = useState({
        opposing_party: '',
        court_name: '',
        case_number: '',
    });

    useEffect(() => {
        if (data?.case) {
            setDetails({
                opposing_party: data.case.opposing_party || '',
                court_name: data.case.court_name || '',
                case_number: data.case.case_number || '',
            });
        }
    }, [data]);

    const upload = async (e) => {
        e.preventDefault();
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File is too large (max 10 MB).');
            return;
        }
        const form = new FormData();
        form.append('document_type', docType);
        form.append('document', file);
        setBusy(true);
        try {
            const result = await api.post(`/cases/${caseId}/documents`, form);
            toast.success(result.message);
            setFile(null);
            setDocType('');
            if (fileInput.current) fileInput.current.value = '';
            reload();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    const saveDetails = async (e) => {
        e.preventDefault();
        setSavingDetails(true);
        try {
            const result = await api.patch(`/cases/${caseId}/details`, details);
            toast.success(result.message);
            reload();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSavingDetails(false);
        }
    };

    const remove = async (doc) => {
        if (!window.confirm(`Delete "${doc.file_name}"? This cannot be undone.`)) return;
        try {
            const result = await api.delete(`/documents/${doc.document_id}`);
            toast.success(result.message);
            reload();
        } catch (err) {
            toast.error(err.message);
        }
    };

    return (
        <main>
            <section className="dashboard">
                <PageHeader title="📂 Documents">
                    {data && <p className="subtitle">Case: <strong className="gold">{data.case.title}</strong></p>}
                </PageHeader>

                <PageStatus error={error} loading={loading && !data} />

                {data && (
                    <>
                        <div className="dashboard_section">
                            <h2>Case Details & Court Information</h2>
                            <div className="table_container panel_padded">
                                {data.userRole === 'lawyer' ? (
                                    <form className="login_form" onSubmit={saveDetails}>
                                        <div className="form_group">
                                            <label htmlFor="opposing_party">Opposing Party Name</label>
                                            <input
                                                id="opposing_party"
                                                type="text"
                                                value={details.opposing_party}
                                                onChange={(e) => setDetails({ ...details, opposing_party: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="form_group">
                                            <label htmlFor="court_name">Court Name</label>
                                            <input
                                                id="court_name"
                                                type="text"
                                                value={details.court_name}
                                                onChange={(e) => setDetails({ ...details, court_name: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="form_group">
                                            <label htmlFor="case_number">Case Number</label>
                                            <input
                                                id="case_number"
                                                type="text"
                                                value={details.case_number}
                                                onChange={(e) => setDetails({ ...details, case_number: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <button type="submit" disabled={savingDetails}>
                                            {savingDetails ? 'Saving…' : 'Save Case Details'}
                                        </button>
                                    </form>
                                ) : (
                                    <div>
                                        <p><strong>Opposing Party:</strong> {data.case.opposing_party || 'Not provided yet'}</p>
                                        <p><strong>Court Name:</strong> {data.case.court_name || 'Not provided yet'}</p>
                                        <p><strong>Case Number:</strong> {data.case.case_number || 'Not provided yet'}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="dashboard_section">
                            <h2>Upload Document</h2>
                            <div className="table_container panel_padded">
                                <form className="login_form" onSubmit={upload}>
                                    <div className="form_group">
                                        <label htmlFor="document_type">Document Type</label>
                                        <select id="document_type" value={docType} onChange={(e) => setDocType(e.target.value)} required>
                                            <option value="">— Choose a type —</option>
                                            {data.types.map((t) => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="form_group">
                                        <label htmlFor="document">Select File (PDF, DOC, DOCX, JPG, PNG, TXT — max 10MB)</label>
                                        <input id="document" ref={fileInput} type="file" className="file_input" required
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                                            onChange={(e) => setFile(e.target.files[0] || null)} />
                                    </div>
                                    <input type="submit" value={busy ? 'Uploading…' : 'Upload'} disabled={busy} />
                                </form>
                            </div>
                        </div>

                        <div className="dashboard_section">
                            <h2>Uploaded Documents</h2>
                            <div className="table_container">
                                <table className="data_table">
                                    <thead>
                                        <tr>
                                            <th>File Name</th>
                                            <th>Type</th>
                                            <th>Uploaded By</th>
                                            <th>Size</th>
                                            <th>Date</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.documents.length === 0 ? (
                                            <tr><td colSpan="6" className="text-center">No documents uploaded yet.</td></tr>
                                        ) : (
                                            data.documents.map((doc) => {
                                                const ext = doc.file_name.split('.').pop().toLowerCase();
                                                const url = `/api/documents/${doc.document_id}/file`;
                                                return (
                                                    <tr key={doc.document_id}>
                                                        <td>📄 {doc.file_name}</td>
                                                        <td>{doc.document_type}</td>
                                                        <td>{doc.is_mine ? 'You' : doc.uploader_name}</td>
                                                        <td>{fileSize(doc.file_size)}</td>
                                                        <td>{shortDate(doc.uploaded_at)}</td>
                                                        <td className="nowrap">
                                                            {IMAGE_TYPES.includes(ext) && (
                                                                <button type="button" className="btn_approve btn_view" onClick={() => setPreview(url)}>🖼️ View</button>
                                                            )}
                                                            <a href={`${url}?download=1`} className="btn_approve btn_save">⬇️ Save</a>
                                                            {doc.is_mine && (
                                                                <button type="button" className="btn_reject btn_delete" onClick={() => remove(doc)}>🗑️ Delete</button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                <div className="back_link"><Link to="/documents">← Back to Documents</Link></div>
            </section>
            {preview && <Lightbox src={preview} onClose={() => setPreview(null)} />}
        </main>
    );
}