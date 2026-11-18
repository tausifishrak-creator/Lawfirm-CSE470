// Controller: case documents (case list, upload, list, view/download).
const fs = require('fs');
const Case = require('../models/Case');
const Document = require('../models/Document');
const HttpError = require('../utils/HttpError');
const { storedPath, absolutePath } = require('../middleware/upload');
const { currentClient, currentLawyer, toId } = require('../utils/profiles');
const { DOCUMENT_CASE_STATUSES, DOCUMENT_TYPES } = require('../utils/constants');

/**
 * Middleware: only the client or lawyer on the case may continue.
 * Runs before the upload middleware so files are never saved for strangers.
 */
async function requireCaseAccess(req, res, next) {
    const found = await Case.findForUser(toId(req.params.caseId), req.session.user);
    if (!found || !DOCUMENT_CASE_STATUSES.includes(found.status)) throw new HttpError(404, 'Case not found.');
    req.caseRecord = found;
    next();
}

// GET /api/documents/cases   (cases the user can attach documents to)
async function cases(req, res) {
    const user = req.session.user;
    const rows =
        user.role === 'client'
            ? await Case.findByStatusForClient((await currentClient(req)).client_id, DOCUMENT_CASE_STATUSES)
            : await Case.findByStatusForLawyer((await currentLawyer(req)).lawyer_id, DOCUMENT_CASE_STATUSES);
    res.json({ cases: rows });
}

// GET /api/cases/:caseId/documents
async function list(req, res) {
    const found = req.caseRecord;
    const userId = req.session.user.user_id;
    const rows = await Document.findByCase(found.case_id);
    res.json({
        userRole: req.session.user.role,
        case: {
    case_id: found.case_id,
    title: found.title,
    case_type: found.case_type,
    opposing_party: found.opposing_party,
    court_name: found.court_name,
    case_number: found.case_number,
},
        types: DOCUMENT_TYPES,
        documents: rows.map(({ uploaded_by, ...doc }) => ({ ...doc, is_mine: uploaded_by === userId })),
    });
}

// POST /api/cases/:caseId/documents   (multipart field name: "document")
async function upload(req, res) {
    const found = req.caseRecord;
    if (!req.file) throw new HttpError(400, 'Please choose a file to upload.');

    const documentType = req.body.document_type;
    if (!DOCUMENT_TYPES.includes(documentType)) {
        fs.unlink(req.file.path, () => {});
        throw new HttpError(400, 'Please choose a document type.');
    }

    await Document.create({
        case_id: found.case_id,
        uploaded_by: req.session.user.user_id,
        document_type: documentType,
        file_name: req.file.originalname,
        file_path: storedPath(req.file),
        file_size: req.file.size,
    });

    res.status(201).json({ message: 'Document uploaded successfully!' });
}

// GET /api/documents/:documentId/file?download=1
async function file(req, res) {
    const doc = await Document.findById(toId(req.params.documentId));
    if (!doc) throw new HttpError(404, 'Document not found.');

    // Same access rule as the case itself.
    const found = await Case.findForUser(doc.case_id, req.session.user);
    if (!found) throw new HttpError(404, 'Document not found.');

    const fullPath = absolutePath(doc.file_path);
    if (!fullPath || !fs.existsSync(fullPath)) throw new HttpError(404, 'File not found on the server.');

    if (req.query.download) {
        return res.download(fullPath, doc.file_name);
    }
    res.sendFile(fullPath);
}

// DELETE /api/documents/:documentId   (only the person who uploaded it)
async function remove(req, res) {
    const doc = await Document.findById(toId(req.params.documentId));
    if (!doc || doc.uploaded_by !== req.session.user.user_id) {
        throw new HttpError(404, 'Document not found.');
    }

    await Document.remove(doc.document_id);
    const fullPath = absolutePath(doc.file_path);
    if (fullPath) fs.unlink(fullPath, () => {});

    res.json({ message: 'Document deleted.' });
}

module.exports = { requireCaseAccess, cases, list, upload, file, remove };
