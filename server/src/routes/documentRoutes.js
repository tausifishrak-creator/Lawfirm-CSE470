const express = require('express');
const documents = require('../controllers/documentController');
const { requireRole } = require('../middleware/auth');
const { caseDocumentUpload } = require('../middleware/upload');

const router = express.Router();

const clientOrLawyer = requireRole('client', 'lawyer');

router.get('/documents/cases', clientOrLawyer, documents.cases);
router.get('/documents/:documentId/file', clientOrLawyer, documents.file);
// Clients are refused inside the controller with a clear message; lawyers may delete only their own uploads.
router.delete('/documents/:documentId', clientOrLawyer, documents.remove);
router.get('/cases/:caseId/documents', clientOrLawyer, documents.requireCaseAccess, documents.list);
router.post(
    '/cases/:caseId/documents',
    clientOrLawyer,
    documents.requireCaseAccess,
    caseDocumentUpload.single('document'),
    documents.upload
);

module.exports = router;
