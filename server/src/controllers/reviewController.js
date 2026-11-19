// Controller: Lawyer Rating & Review System endpoints.
const Client = require('../models/Client');
const Lawyer = require('../models/Lawyer');
const Case = require('../models/Case');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const HttpError = require('../utils/HttpError');

const reviewController = {
    /**
     * Get review dashboard based on user role:
     * - Client: eligible completed cases to review + history of submitted reviews.
     * - Lawyer: rating summary/distribution + list of received reviews.
     */
    async getReviewsOverview(req, res, next) {
        try {
            const { role, user_id } = req.session.user;

            if (role === 'client') {
                const client = await Client.findByUserId(user_id);
                if (!client) {
                    throw new HttpError(404, 'Client profile not found.');
                }

                const reviewableCases = await Review.findReviewableCasesForClient(client.client_id);
                const myReviews = await Review.findByClient(client.client_id);

                return res.json({
                    role: 'client',
                    reviewableCases,
                    myReviews,
                });
            }

            if (role === 'lawyer') {
                const lawyer = await Lawyer.findByUserId(user_id);
                if (!lawyer) {
                    throw new HttpError(404, 'Lawyer profile not found.');
                }

                const summary = await Review.getLawyerSummary(lawyer.lawyer_id);
                const reviews = await Review.findByLawyer(lawyer.lawyer_id);

                return res.json({
                    role: 'lawyer',
                    summary,
                    reviews,
                });
            }

            throw new HttpError(403, 'Reviews dashboard is only available to clients and lawyers.');
        } catch (err) {
            next(err);
        }
    },

    /**
     * Submit a rating and review for a completed case (Client only, 1 review per case).
     */
    async submitReview(req, res, next) {
        try {
            const { user_id } = req.session.user;
            const caseId = Number(req.body.caseId);
            const rating = Number(req.body.rating);
            const comment = (req.body.comment || '').trim();

            if (!caseId || !rating || rating < 1 || rating > 5) {
                throw new HttpError(400, 'Please provide a valid case and a star rating between 1 and 5.');
            }

            const client = await Client.findByUserId(user_id);
            if (!client) {
                throw new HttpError(404, 'Client profile not found.');
            }

            // Verify case belongs to client
            const caseRecord = await Case.findById(caseId);
            if (!caseRecord || caseRecord.client_id !== client.client_id) {
                throw new HttpError(404, 'Case not found or does not belong to you.');
            }

            // Verify case is completed
            if (!Review.COMPLETED_STATUSES.includes(caseRecord.status)) {
                throw new HttpError(400, `You can only review completed cases (Closed, Won, or Lost). Current status: ${caseRecord.status}`);
            }

            // Enforce strictly 1 review per case
            const existingReview = await Review.findByCaseId(caseId);
            if (existingReview) {
                throw new HttpError(409, 'You have already submitted a review for this case.');
            }

            const reviewId = await Review.create({
                caseId,
                clientId: client.client_id,
                lawyerId: caseRecord.lawyer_id,
                rating,
                comment,
            });

            // Notify lawyer
            const lawyerUserId = await Lawyer.getUserId(caseRecord.lawyer_id);
            if (lawyerUserId) {
                await Notification.push(
                    lawyerUserId,
                    `New ${rating}-star client review received for "${caseRecord.title}"`,
                    '/reviews'
                );
            }

            res.status(201).json({
                message: 'Review submitted successfully. Thank you for your feedback!',
                reviewId,
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Get reviews and rating summary for a lawyer (used in search or public profile).
     */
    async getLawyerReviews(req, res, next) {
        try {
            const lawyerId = Number(req.params.lawyerId);
            const summary = await Review.getLawyerSummary(lawyerId);
            const reviews = await Review.findByLawyer(lawyerId);

            res.json({
                summary,
                reviews,
            });
        } catch (err) {
            next(err);
        }
    },
};

module.exports = reviewController;
