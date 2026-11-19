// Controller: register, login, logout and "who am I".
const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const User = require('../models/User');
const Client = require('../models/Client');
const Lawyer = require('../models/Lawyer');
const HttpError = require('../utils/HttpError');
const { storedPath } = require('../middleware/upload');

function publicUser(user) {
    return {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
    };
}

// PHP's password_hash() writes "$2y$" hashes; bcryptjs uses "$2a$/$2b$". The algorithm is the same.
function normalizeHash(hash) {
    return hash.startsWith('$2y$') ? `$2a$${hash.slice(4)}` : hash;
}

// POST /api/auth/login
async function login(req, res) {
    const username = (req.body.username || '').trim();
    const password = (req.body.password || '').trim();

    if (!username || !password) {
        throw new HttpError(400, 'Please fill in all fields.');
    }

    const user = await User.findByUsername(username);
    if (!user || !(await bcrypt.compare(password, normalizeHash(user.password)))) {
        throw new HttpError(401, 'Invalid username or password.');
    }
    //no need for role check here because the user role is already stored in the database and will be returned in the session

    // New session id on login (prevents session fixation).
    await new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
    req.session.user = publicUser(user);
    res.json({ user: req.session.user });
}

// POST /api/auth/register  (multipart/form-data because lawyers upload a document)
async function register(req, res) {
    const body = req.body;
    const full_name = (body.full_name || '').trim();
    const email = (body.email || '').trim();
    const username = (body.username || '').trim();
    const password = (body.password || '').trim();
    const confirm = (body.confirm_password || '').trim();
    const role = (body.role || '').trim();

    const errors = [];
    if (!full_name || !email || !username || !password || !role) errors.push('All fields are required.');
    if (password !== confirm) errors.push('Passwords do not match.');
    if (password.length < 6) errors.push('Password must be at least 6 characters.');
    if (!['client', 'lawyer'].includes(role)) errors.push('Invalid role selected.');
    if (role === 'lawyer' && !req.file) errors.push('Please upload your ID / certificate document.');
    if (errors.length === 0 && (await User.usernameOrEmailExists(username, email))) {
        errors.push('Username or email already exists.');
    }
    if (errors.length > 0) {
        removeUpload(req.file);
        return res.status(400).json({ error: errors.join(' '), errors });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    try {
        await saveNewUser(req, { full_name, email, username, passwordHash, role });
    } catch (err) {
        removeUpload(req.file);
        throw err;
    }

    res.status(201).json({ message: 'Registration successful! Please log in.' });
}

/** Delete an uploaded file that is no longer needed (e.g. registration failed). */
function removeUpload(file) {
    if (file) fs.unlink(file.path, () => {});
}

/** Insert the user and their client/lawyer profile in one transaction. */
function saveNewUser(req, { full_name, email, username, passwordHash, role }) {
    const body = req.body;
    return db.transaction(async (conn) => {
        const userId = await User.create({ full_name, email, username, passwordHash, role }, conn);

        if (role === 'client') {
            await Client.create(
                { user_id: userId, phone: (body.phone || '').trim(), address: (body.address || '').trim() },
                conn
            );
        } else {
            await Lawyer.create(
                {
                    user_id: userId,
                    specialization: (body.specialization || '').trim(),
                    location: (body.location || '').trim(),
                    experience_years: Number.parseInt(body.experience_years, 10) || 0,
                    consultation_fee: Number.parseFloat(body.consultation_fee) || 0,
                    bio: (body.bio || '').trim(),
                    verification_doc: req.file ? storedPath(req.file) : null,
                },
                conn
            );
        }
    });
}

// POST /api/auth/logout
function logout(req, res) {
    req.session.destroy(() => {
        res.clearCookie('lawfirm.sid');
        res.json({ message: 'You have been logged out.' });
    });
}

// GET /api/auth/me
function me(req, res) {
    res.json({ user: req.session.user || null });
}

module.exports = { login, register, logout, me };
