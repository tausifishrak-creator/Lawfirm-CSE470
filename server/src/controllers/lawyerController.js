// Controller: clients browse verified lawyers to choose who to send a case to.
const Lawyer = require('../models/Lawyer');
const Availability = require('../models/Availability');
const HttpError = require('../utils/HttpError');
const { toId } = require('../utils/profiles');

// GET /api/lawyers?specialization=&location=&min_experience=&max_fee=
async function search(req, res) {
    const lawyers = await Lawyer.search({
        specialization: String(req.query.specialization || '').trim(),
        location: String(req.query.location || '').trim(),
        minExperience: Number.parseInt(req.query.min_experience, 10) || 0,
        maxFee: Number.parseFloat(req.query.max_fee) || 0,
    });
    const days = await Availability.workingDaysFor(lawyers.map((l) => l.lawyer_id));

    res.json({
        lawyers: lawyers.map((l) => ({
            ...l,
            consultation_fee: Number(l.consultation_fee),
            working_days: days[l.lawyer_id] || [],
        })),
    });
}

// GET /api/lawyers/:lawyerId
async function show(req, res) {
    const lawyer = await Lawyer.findPublicById(toId(req.params.lawyerId));
    if (!lawyer || !lawyer.is_verified) throw new HttpError(404, 'Lawyer not found.');
    res.json({ lawyer: { ...lawyer, consultation_fee: Number(lawyer.consultation_fee) } });
}

module.exports = { search, show };
