
const CaseTask = require('../models/CaseTask');
const Case = require('../models/Case');
const Lawyer = require('../models/Lawyer');
const HttpError = require('../utils/HttpError');
const { toId } = require('../utils/profiles');
const { DOCUMENT_CASE_STATUSES } = require('../utils/constants');

async function list(req, res) {
    const lawyer = await Lawyer.findByUserId(req.session.user.user_id);

    const [tasks, cases] = await Promise.all([
        CaseTask.findByLawyer(lawyer.lawyer_id),
        Case.findByStatusForLawyer(
            lawyer.lawyer_id,
            DOCUMENT_CASE_STATUSES
        )
    ]);

    res.json({ tasks, cases });
}

async function create(req, res) {
    const lawyer = await Lawyer.findByUserId(req.session.user.user_id);

    const caseId = toId(req.body.case_id);
    const found = await Case.findForUser(caseId, req.session.user);

    if (!found || found.lawyer_id !== lawyer.lawyer_id) {
        throw new HttpError(404, 'Case not found.');
    }

    const { task_title, description, due_date } = req.body;

    if (!task_title?.trim() || !due_date) {
        throw new HttpError(400, 'Task title and due date are required.');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(due_date) ||
        Number.isNaN(Date.parse(`${due_date}T00:00:00Z`))) {
        throw new HttpError(400, 'Please provide a valid due date.');
    }

    await CaseTask.create({
        case_id: caseId,
        lawyer_id: lawyer.lawyer_id,
        task_title: task_title.trim(),
        description,
        due_date
    });

    res.status(201).json({ message: 'Task created successfully!' });
}

async function updateStatus(req, res) {
    const lawyer = await Lawyer.findByUserId(req.session.user.user_id);
    const status = req.body.status;

    if (!['Pending', 'Done'].includes(status)) {
        throw new HttpError(400, 'Invalid task status.');
    }

    const result = await CaseTask.updateStatus(
        toId(req.params.taskId),
        lawyer.lawyer_id,
        status
    );

    if (!result.affectedRows) throw new HttpError(404, 'Task not found.');

    res.json({ message: 'Task status updated.' });
}

async function remove(req, res) {
    const lawyer = await Lawyer.findByUserId(req.session.user.user_id);

    const result = await CaseTask.delete(
        toId(req.params.taskId),
        lawyer.lawyer_id
    );

    if (!result.affectedRows) throw new HttpError(404, 'Task not found.');

    res.json({ message: 'Task deleted.' });
}

module.exports = { list, create, updateStatus, remove };