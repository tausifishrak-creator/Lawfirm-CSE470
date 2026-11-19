// Controller for public statistics shown in the landing page/
const Lawyer = require('../models/Lawyer');
const Case  = require('../models/Case');

// get API stat (public data, no login needed)
async function publicStatistics(req, res) {
    const [lawyers, casesWon] = await Promise.all([Lawyer.countLawyers(), Case.countcaseswon()]);
    res.json({ lawyers, casesWon});
}

module.exports = {publicStatistics};