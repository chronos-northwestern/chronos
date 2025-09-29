'use server';
import { ScheduledMeeting } from './IMatchingAlgorithm';
import { Client } from 'pg';

// Helper function to convert Central Time to UTC (handles DST)
function convertCentralTimeToUTC(date: Date): string {
    // Use JavaScript's built-in timezone conversion
    // Create a date string that represents the time in Central Time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    // Create a date string in Central Time format
    const centralTimeStr = `${year}-${month}-${day}T${hour}:${minute}:00`;

    // Parse this as if it's in Central Time and convert to UTC
    // We'll use a trick: create the date and then adjust for timezone
    const tempDate = new Date(centralTimeStr);

    // Get what this time would be in Central Time
    const centralTime = new Date(tempDate.toLocaleString("en-US", { timeZone: "America/Chicago" }));

    // Calculate the difference and convert to UTC
    const offsetMs = tempDate.getTime() - centralTime.getTime();
    const utcDate = new Date(tempDate.getTime() + offsetMs);

    return utcDate.toISOString();
}

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

        // Convert Central Time to UTC for database storage (handles DST automatically)
        // The scheduler generates times in Central Time, we need to convert to UTC
        const centralTimeStart = `${parsedEventDate} ${startTime}:00`;
        const centralTimeEnd = `${parsedEventDate} ${endTime}:00`;

        console.log(`[DEBUG] Converting Central Time to UTC for storage:`);
        console.log(`  - Central Time: ${centralTimeStart} - ${centralTimeEnd}`);

        // Parse the date components
        const [year, month, day] = parsedEventDate.split('-').map(Number);
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);

        // Create Date objects in Central Time
        const startDate = new Date(year, month - 1, day, startHour, startMin, 0);
        const endDate = new Date(year, month - 1, day, endHour, endMin, 0);

        console.log(`  - Central Time: ${startDate} - ${endDate}`);

        // Convert to UTC using the helper function
        const startTimeUTC = convertCentralTimeToUTC(startDate);
        const endTimeUTC = convertCentralTimeToUTC(endDate);

        console.log(`  - UTC: ${startTimeUTC} - ${endTimeUTC}`);

        await client.query(
            'INSERT INTO meetings (event_id, faculty_id, student_id, start_time, end_time, source, run_id) VALUES ($1, $2, $3, $4::timestamp with time zone, $5::timestamp with time zone, $6, $7)',
            [m.eventId, m.professorId, m.studentId, startTimeUTC, endTimeUTC, 'AUTO', runId]
        );
    }
    await client.end();
} 