import Analysis from "../models/Analysis.js";
import Project from "../models/Project.js";

// Length of an array field (0 if missing)
const sizeOf = (field) => ({ $size: { $ifNull: [field, []] } });

function dayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getStats(req, res, next) {
  try {
    const userId = req.user._id; // only this user's data

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    const [totalsAgg, recent, languages, recentProjects, last7] = await Promise.all([
      Analysis.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            analyses: { $sum: 1 },
            issues: { $sum: { $add: [sizeOf("$staticFindings"), sizeOf("$aiFindings")] } },
            testCases: { $sum: sizeOf("$testCases") },
          },
        },
      ]),
      Analysis.aggregate([
        { $match: { userId } },
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
        {
          $project: {
            projectName: 1,
            language: 1,
            qualityScore: 1,
            status: 1,
            createdAt: 1,
            findingsCount: { $add: [sizeOf("$staticFindings"), sizeOf("$aiFindings")] },
          },
        },
      ]),
      Analysis.aggregate([
        { $match: { userId } },
        { $group: { _id: "$language", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Project.find({ userId }).sort({ createdAt: -1 }).limit(5).select("projectName language createdAt"),
      Analysis.find({ userId, createdAt: { $gte: start } }).select("createdAt"),
    ]);

    // Count analyses per day for the last 7 days (days with none show 0)
    const counts = {};
    last7.forEach((a) => {
      const key = dayKey(a.createdAt);
      counts[key] = (counts[key] || 0) + 1;
    });
    const activity = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = dayKey(d);
      activity.push({ date: key, count: counts[key] || 0 });
    }

    const totals = totalsAgg[0] || { analyses: 0, issues: 0, testCases: 0 };

    res.json({
      totals: { analyses: totals.analyses, issues: totals.issues, testCases: totals.testCases },
      recent,
      activity,
      languages: languages.map((l) => ({ language: l._id, count: l.count })),
      recentProjects,
    });
  } catch (err) {
    next(err);
  }
}