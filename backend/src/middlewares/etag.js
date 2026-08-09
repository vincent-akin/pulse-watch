const crypto = require('crypto');
const AppError = require('../common/AppError');
const { MUTABLE_ETAG_RESOURCES } = require('../common/constants');

// Computes a stable ETag from a Mongoose document's persisted state (updatedAt + version marker).
function computeEtag(doc) {
  const basis = `${doc._id}:${doc.updatedAt ? doc.updatedAt.getTime() : 0}:${doc.__v || 0}`;
  return `"${crypto.createHash('sha1').update(basis).digest('hex')}"`;
}

// Sets the ETag response header for GETs on mutable resources (monitors, notificationChannels, statusPages, organizations).
function setEtagHeader(res, doc) {
  res.setHeader('ETag', computeEtag(doc));
}

// Enforces If-Match on mutating requests (PATCH/PUT/DELETE) for the resources listed in MUTABLE_ETAG_RESOURCES.
// A missing or stale If-Match against a resource that has since changed returns 412 Precondition Failed.
function requireIfMatch(resourceName) {
  return (req, res, next) => {
    if (!MUTABLE_ETAG_RESOURCES.includes(resourceName)) return next();
    const ifMatch = req.headers['if-match'];
    if (!ifMatch) {
      return next(AppError.preconditionFailed('If-Match header is required to update this resource.'));
    }
    req._ifMatch = ifMatch;
    next();
  };
}

function assertEtagMatches(doc, ifMatch) {
  const current = computeEtag(doc);
  if (current !== ifMatch) {
    throw AppError.preconditionFailed('The resource has changed since it was last fetched. Refetch and retry.');
  }
}

module.exports = { computeEtag, setEtagHeader, requireIfMatch, assertEtagMatches };
