
const db = require('../config/db');

const CaseTask = {
    findByLawyer(lawyerId) {
        return db.query(
            `SELECT t.*, c.title AS case_title,
                    CASE WHEN t.due_date < CURDATE()
                         AND t.status = 'Pending'
                         THEN 1 ELSE 0 END AS is_overdue
             FROM case_tasks t
             JOIN cases c ON t.case_id = c.case_id
             WHERE t.lawyer_id = ?
             ORDER BY t.due_date ASC`,
            [lawyerId]
        );
    },

    create(task) {
        return db.query(
            `INSERT INTO case_tasks
             (case_id, lawyer_id, task_title, description, due_date)
             VALUES (?, ?, ?, ?, ?)`,
            [
                task.case_id,
                task.lawyer_id,
                task.task_title,
                task.description || null,
                task.due_date
            ]
        );
    },

    updateStatus(taskId, lawyerId, status) {
        return db.query(
            `UPDATE case_tasks
             SET status = ?
             WHERE task_id = ? AND lawyer_id = ?`,
            [status, taskId, lawyerId]
        );
    },

    delete(taskId, lawyerId) {
        return db.query(
            `DELETE FROM case_tasks
             WHERE task_id = ? AND lawyer_id = ?`,
            [taskId, lawyerId]
        );
    }
};

module.exports = CaseTask;