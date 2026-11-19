// Controller: data for the lawyer and admin dashboards.
const Case = require('../models/Case');
const Lawyer = require('../models/Lawyer');
const Notification = require('../models/Notification');
const { currentLawyer } = require('../utils/profiles');

function toChart(rows, labelKey, valueKey) {
    return {
        labels: rows.map((row) => row[labelKey]),
        data: rows.map((row) => Number(row[valueKey])),
    };
}

// GET /api/dashboard/client   (unread notification counts for the dashboard cards)
async function clientDashboard(req, res) {
    res.json({ badges: await Notification.unreadBySection(req.session.user.user_id) });
}

// GET /api/dashboard/lawyer
async function lawyerDashboard(req, res) {
    const lawyer = await currentLawyer(req);
    const [pendingCount, badges] = await Promise.all([
        Case.countPendingForLawyer(lawyer.lawyer_id),
        Notification.unreadBySection(req.session.user.user_id),
    ]);
    res.json({
        pendingCount,
        badges,
        profile: {
            specialization: lawyer.specialization,
            location: lawyer.location,
            experience_years: lawyer.experience_years,
            consultation_fee: Number(lawyer.consultation_fee),
            is_verified: Boolean(lawyer.is_verified),
            verification_status: lawyer.verification_status,
        },
    });
}

// GET /api/dashboard/admin
async function adminDashboard(req, res) {
    const [caseRows, verificationRows, pendingLawyers, verificationHistory] = await Promise.all([
        Case.countByStatus(),
        Lawyer.countByVerification(),
        Lawyer.findPendingVerification(),
        Lawyer.verificationHistory(),
    ]);

    res.json({
        caseChart: toChart(caseRows, 'status', 'count'),
        verificationChart: toChart(verificationRows, 'status', 'count'),
        pendingLawyers: pendingLawyers.map((l) => ({ ...l, has_document: Boolean(l.has_document) })),
        verificationHistory,
    });
}

module.exports = { clientDashboard, lawyerDashboard, adminDashboard };
