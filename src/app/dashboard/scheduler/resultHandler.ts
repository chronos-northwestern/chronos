'use server';
import { ScheduledMeeting } from './IMatchingAlgorithm';
import { Client } from 'pg';

export async function saveMeetings(meetings: ScheduledMeeting[], runId: number) {
    if (!meetings.length) return;
    const eventId = meetings[0].eventId;
    const client = new Client({ connectionString: process.env.NEON_POSTGRES_URL });
    await client.connect();
    // Fetch event date for this eventId - cast to text to avoid timezone issues
    const eventRes = await client.query('SELECT to_char(date, \'YYYY-MM-DD\') as date FROM events WHERE id = $1', [eventId]);
    if (!eventRes.rows.length) throw new Error('Event not found');
    const eventDate = eventRes.rows[0].date; // e.g., '2024-07-10'

    console.log(`[DEBUG] Raw event date from database: ${eventDate}`);
    console.log(`[DEBUG] Event date type: ${typeof eventDate}`);
    console.log(`[DEBUG] Event date constructor: ${eventDate.constructor.name}`);
    // Remove existing meetings for this event and runId
    await client.query('DELETE FROM meetings WHERE event_id = $1 AND run_id = $2', [eventId, runId]);
    // Helper to parse slot string to timestamps
    function parseSlotToTimestamps(eventDate: string, slot: string) {
        const [start, end] = slot.split('-').map(s => s.trim());

        // Debug logging to see what's being created
        console.log(`[DEBUG] Event date: ${eventDate}, Slot: ${slot}`);
        console.log(`[DEBUG] Start time: ${start}, End time: ${end}`);

        // Return the raw components for SQL construction
        return {
            eventDateStr: eventDate,
            startTime: start,
            endTime: end
        };
    }
    // Insert new meetings
    for (const m of meetings) {
        // Ensure eventDate is just YYYY-MM-DD
        const eventDateStr = typeof eventDate === 'string'
            ? eventDate.slice(0, 10)
            : eventDate instanceof Date
                ? eventDate.toISOString().slice(0, 10)
                : '';
        const { eventDateStr: parsedEventDate, startTime, endTime } = parseSlotToTimestamps(eventDateStr, m.slot);

        // Convert Central Time to UTC for database storage
        const centralTimeStart = `${parsedEventDate} ${startTime}:00`;
        const centralTimeEnd = `${parsedEventDate} ${endTime}:00`;

        // Convert to UTC for proper storage
        const startTimeUTC = new Date(centralTimeStart + ' America/Chicago').toISOString();
        const endTimeUTC = new Date(centralTimeEnd + ' America/Chicago').toISOString();

        console.log(`[DEBUG] Converting Central Time to UTC for storage:`);
        console.log(`  - Central Time: ${centralTimeStart} - ${centralTimeEnd}`);
        console.log(`  - UTC: ${startTimeUTC} - ${endTimeUTC}`);

        await client.query(
            'INSERT INTO meetings (event_id, faculty_id, student_id, start_time, end_time, source, run_id) VALUES ($1, $2, $3, $4::timestamp with time zone, $5::timestamp with time zone, $6, $7)',
            [m.eventId, m.professorId, m.studentId, startTimeUTC, endTimeUTC, 'AUTO', runId]
        );
    }
    await client.end();
} 