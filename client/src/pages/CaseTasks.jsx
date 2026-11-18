
import { useState } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import useApi from '../hooks/useApi';
import { PageHeader, PageStatus } from '../components/ui';

export default function CaseTasks() {
    const toast = useToast();
    const { data, error, loading, reload } = useApi('/tasks');

    const [form, setForm] = useState({
        case_id: '',
        task_title: '',
        description: '',
        due_date: ''
    });
    const [busy, setBusy] = useState(false);

    const tasks = data?.tasks || [];
    const cases = data?.cases || [];

    async function handleSubmit(e) {
        e.preventDefault();
        setBusy(true);

        try {
            const result = await api.post('/tasks', form);
            toast.success(result.message);
            setForm({
                case_id: '',
                task_title: '',
                description: '',
                due_date: ''
            });
            reload();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function changeStatus(taskId, status) {
        try {
            const result = await api.patch(`/tasks/${taskId}/status`, { status });
            toast.success(result.message);
            reload();
        } catch (err) {
            toast.error(err.message);
        }
    }

    async function deleteTask(taskId) {
        if (!window.confirm('Delete this task?')) return;

        try {
            const result = await api.delete(`/tasks/${taskId}`);
            toast.success(result.message);
            reload();
        } catch (err) {
            toast.error(err.message);
        }
    }

    return (
        <main>
            <section className="dashboard">
                <PageHeader title="Case Tasks">
                    <p>Manage your case-related tasks and deadlines.</p>
                </PageHeader>

                <PageStatus loading={loading} error={error} />

                <section className="dashboard_section">
                    <h2>Create a Task</h2>

                    <form onSubmit={handleSubmit}>
    <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        maxWidth: '800px'
    }}>
        <div>
            <label>Case</label>
            <select
                style={{ width: '100%', padding: '12px' }}
                value={form.case_id}
                onChange={e => setForm({ ...form, case_id: e.target.value })}
                required
            >
                <option value="">Select a case</option>
                {cases.map(item => (
                    <option key={item.case_id} value={item.case_id}>
                        {item.title}
                    </option>
                ))}
            </select>
        </div>

        <div>
            <label>Task Title</label>
            <input
                style={{ width: '100%', padding: '12px' }}
                type="text"
                value={form.task_title}
                onChange={e => setForm({ ...form, task_title: e.target.value })}
                placeholder="e.g. Prepare court documents"
                required
            />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
            <label>Description</label>
            <textarea
                style={{ width: '100%', padding: '12px', minHeight: '90px' }}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Task details (optional)"
            />
        </div>

        <div>
            <label>Due Date</label>
            <input
                style={{ width: '100%', padding: '12px' }}
                type="date"
                value={form.due_date}
                onChange={e => setForm({ ...form, due_date: e.target.value })}
                required
            />
        </div>
    </div>

    <div style={{ marginTop: '20px' }}>
        <button type="submit" className="btn_primary"
            disabled={busy || cases.length === 0}>
            {busy ? 'Creating...' : 'Create Task'}
        </button>
    </div>

    {cases.length === 0 && (
        <p>No assigned cases are available for creating tasks.</p>
    )}
</form>
                </section>

                <section className="dashboard_section">
                    <h2>My Tasks</h2>

                    {tasks.length === 0 ? (
                        <p>No tasks created yet.</p>
                    ) : (
                        tasks.map(task => (
                            <article
                                key={task.task_id}
                                className="task_item"
                                style={{
                                    borderLeft: task.is_overdue ? '4px solid #dc2626' : '4px solid #16a34a',
                                    padding: '12px',
                                    marginBottom: '12px'
                                }}
                            >
                                <h3>{task.task_title}</h3>
                                <p><strong>Case:</strong> {task.case_title}</p>
                                {task.description && <p>{task.description}</p>}
                                <p>
                                    <strong>Due:</strong> {String(task.due_date).slice(0, 10)}
                                </p>
                                <p>
                                    <strong>Status:</strong> {task.status}
                                    {task.is_overdue === 1 && (
                                        <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                                            {' '}— OVERDUE
                                        </span>
                                    )}
                                </p>

                                <button
                                    type="button"
                                    onClick={() => changeStatus(
                                        task.task_id,
                                        task.status === 'Done' ? 'Pending' : 'Done'
                                    )}
                                >
                                    Mark as {task.status === 'Done' ? 'Pending' : 'Done'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => deleteTask(task.task_id)}
                                >
                                    Delete
                                </button>
                            </article>
                        ))
                    )}
                </section>
            </section>
        </main>
    );
}