
const Case = require('../models/Case');
const HttpError = require('../utils/HttpError');
const { toId } = require('../utils/profiles');

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

module.exports = { updateDetails };