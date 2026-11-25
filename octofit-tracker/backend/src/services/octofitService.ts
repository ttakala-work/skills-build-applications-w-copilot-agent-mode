import { Activity, Team, User, Workout } from '../models/index.js';
import mongoose from 'mongoose';

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function objectId(value: unknown) {
  return typeof value === 'string' && mongoose.isValidObjectId(value);
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') throw httpError(400, 'Valid activity data is required');
  const data = input as Record<string, unknown>;
  if (!objectId(data.userId) || !objectId(data.teamId) || typeof data.type !== 'string' || !data.type.trim()) {
    throw httpError(400, 'A valid user, team, type, and minutes are required');
  }
  if (typeof data.minutes !== 'number' || !Number.isFinite(data.minutes) || data.minutes < 1) {
    throw httpError(400, 'Minutes must be a positive number');
  }
  const [user, team] = await Promise.all([
    User.findById(data.userId),
    Team.findById(data.teamId),
  ]);
  if (!user || !team) throw httpError(404, 'User or team not found');
  return Activity.create({
    user: user._id,
    team: team._id,
    type: data.type.trim(),
    minutes: data.minutes,
    points: data.minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') throw httpError(400, 'Valid team data is required');
  const data = input as Record<string, unknown>;
  if (typeof data.name !== 'string' || !data.name.trim()) throw httpError(400, 'Team name is required');
  if (typeof data.mascot !== 'string' || !data.mascot.trim()) throw httpError(400, 'Team mascot is required');
  const members = data.members === undefined ? [] : data.members;
  if (!Array.isArray(members)) throw httpError(400, 'Team members must be an array');
  if (!members.every((member) => objectId(member))) throw httpError(400, 'Team members must be valid user IDs');
  if (members.length) {
    const count = await User.countDocuments({ _id: { $in: members } });
    if (count !== members.length) throw httpError(404, 'One or more team members were not found');
  }
  return Team.create({ name: data.name.trim(), mascot: data.mascot.trim(), members });
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
  ]);
  const teams = await Team.find({ _id: { $in: totals.map((item) => item._id) } }).lean();
  const teamNames = new Map(teams.map((team) => [team._id.toString(), team.name]));
  return totals
    .map((item) => ({
      teamName: teamNames.get(item._id.toString()) ?? 'Unknown team',
      totalPoints: item.totalPoints,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail });
  if (!user) throw httpError(404, 'User not found');
  const recent = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean();
  const recentType = recent[0]?.type;
  const focus = recentType === 'run' ? 'endurance' : (recentType ?? user.fitnessGoal);
  const workouts = await Workout.find({
    $or: [{ focus }, { focus: user.fitnessGoal }],
  }).lean();
  const ordered = workouts.sort((a, b) => {
    const aMatch = a.focus === focus ? 0 : 1;
    const bMatch = b.focus === focus ? 0 : 1;
    return aMatch - bMatch;
  });
  return ordered.map((workout) => ({
    ...workout,
    reason: recentType
      ? `Based on your recent ${recentType} activity`
      : `Based on your ${user.fitnessGoal} fitness goal`,
  }));
}

export { User };
