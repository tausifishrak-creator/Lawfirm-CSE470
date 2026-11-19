
const Case = require('../models/Case');
const Client = require('../models/Client');
const Lawyer = require('../models/Lawyer');
const Notification = require('../models/Notification');
const HttpError = require('../utils/HttpError');
const { currentClient, currentLawyer, toId } = require('../utils/profiles');
const { DOCUMENT_CASE_STATUSES } = require('../utils/constants');

const CASE_CATEGORIES = ['Criminal Law', 'Family Law', 'Corporate Law', 'Civil Law', 'Tax Law', 'Property Law', 'Labor Law', 'Other'];

// Statuses a lawyer can move an accepted case through.
const PROGRESS_STATUSES = ['Accepted', 'In Progress', 'Waiting for Documents', 'Scheduled for Hearing', 'Closed', 'Won', 'Lost'];

// GET /api/cases
//   client -> { cases }               every case they submitted, any status
//   lawyer -> { pending, cases }      requests waiting for an answer + accepted cases
async function list(req, res) {
    const user = req.session.user;
    await Notification.markLinksRead(user.user_id, ['/cases', '/cases?tab=pending']);

    if (user.role === 'client') {
        const client = await currentClient(req);
        return res.json({ cases: await Case.findAllForClient(client.client_id), categories: CASE_CATEGORIES });
    }

    const lawyer = await currentLawyer(req);
    const [pending, cases] = await Promise.all([
        Case.findPendingForLawyer(lawyer.lawyer_id),
        Case.findByStatusForLawyer(lawyer.lawyer_id, DOCUMENT_CASE_STATUSES),
    ]);
    res.json({ pending, cases, statuses: PROGRESS_STATUSES, isVerified: Boolean(lawyer.is_verified) });
}

// POST /api/cases   (client)  body: { lawyer_id, title, case_type, description }
async function create(req, res) {
    const lawyerId = toId(req.body.lawyer_id);
    const title = String(req.body.title || '').trim();
    const caseType = String(req.body.case_type || '').trim();
    const description = String(req.body.description || '').trim();

    if (!lawyerId || !title || !caseType || !description) throw new HttpError(400, 'Please fill in all fields.');
    if (!CASE_CATEGORIES.includes(caseType)) throw new HttpError(400, 'Please choose a valid case category.');
    if (title.length > 200) throw new HttpError(400, 'The case title is too long (max 200 characters).');

    const lawyer = await Lawyer.findPublicById(lawyerId);
    if (!lawyer || !lawyer.is_verified) throw new HttpError(404, 'Lawyer not found.');

    const client = await currentClient(req);
    await Case.create({ client_id: client.client_id, lawyer_id: lawyerId, title, description, case_type: caseType });

    await Notification.push(
        await Lawyer.getUserId(lawyerId),
        `New case request from ${req.session.user.full_name}: ${title}`,
        '/cases?tab=pending'
    );

    res.status(201).json({ message: `Your case was sent to ${lawyer.full_name}. You'll be notified when they respond.` });
}

/** A case belonging to the logged-in lawyer, or a 404. */
async function lawyersCase(req) {
    const lawyer = await currentLawyer(req);
    const found = await Case.findById(toId(req.params.caseId));
    if (!found || found.lawyer_id !== lawyer.lawyer_id) throw new HttpError(404, 'Case not found.');
    return { lawyer, found };
}

// PATCH /api/cases/:caseId/respond   (lawyer)  body: { action: "accept" | "decline" }
async function respond(req, res) {
    const action = req.body.action;
    if (!['accept', 'decline'].includes(action)) throw new HttpError(400, 'Invalid action.');

    const { lawyer, found } = await lawyersCase(req);
    if (found.status !== 'Pending') throw new HttpError(400, 'This request has already been answered.');
    if (action === 'accept' && !lawyer.is_verified) {
        throw new HttpError(403, 'Your account must be verified by an admin before you can accept cases.');
    }

    const accepted = action === 'accept';
    await Case.updateStatus(found.case_id, accepted ? 'Accepted' : 'Rejected');
    await Notification.push(
        await Client.getUserId(found.client_id),
        accepted
            ? `${req.session.user.full_name} accepted your case "${found.title}". You can now book appointments and share documents.`
            : `${req.session.user.full_name} declined your case "${found.title}".`,
        '/cases'
    );

    res.json({ message: accepted ? 'Case accepted. The client has been notified.' : 'Case declined. The client has been notified.' });
}

// PATCH /api/cases/:caseId/status   (lawyer)  body: { status }
async function updateStatus(req, res) {
    const status = req.body.status;
    if (!PROGRESS_STATUSES.includes(status)) throw new HttpError(400, 'Invalid status.');

    const { found } = await lawyersCase(req);
    if (['Pending', 'Rejected'].includes(found.status)) {
        throw new HttpError(400, 'Accept the case request before changing its status.');
    }

    await Case.updateStatus(found.case_id, status);
    await Notification.push(
        await Client.getUserId(found.client_id),
        `Your case "${found.title}" is now: ${status}`,
        '/cases'
    );
    res.json({ message: 'Case status updated. The client has been notified.' });
}

// PUT /api/cases/:caseId/details
async function updateDetails(req, res) {
    const caseId = toId(req.params.caseId);

    // Only lawyers can update court information.
    if (req.session.user.role !== 'lawyer') {
        throw new HttpError(403, 'Only lawyers can update case details.');
    }

    // Check that the case belongs to this lawyer.
    const found = await Case.findForUser(caseId, req.session.user);

    if (!found) {
        throw new HttpError(404, 'Case not found.');
    }

    const { opposing_party, court_name, case_number } = req.body;

    if (
        typeof opposing_party !== 'string' ||
        typeof court_name !== 'string' ||
        typeof case_number !== 'string' ||
        !opposing_party.trim() ||
        !court_name.trim() ||
        !case_number.trim()
    ) {
        throw new HttpError(400, 'Please fill in all case details.');
    }

    await Case.updateDetails(caseId, {
        opposing_party: opposing_party.trim(),
        court_name: court_name.trim(),
        case_number: case_number.trim()
    });

    res.json({ message: 'Case details updated successfully!' });
}

module.exports = { list, create, respond, updateStatus, updateDetails };