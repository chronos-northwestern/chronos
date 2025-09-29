'use server';
import { Client } from 'pg';
import { revalidatePath } from 'next/cache';

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

export async function createMeeting(formData: FormData) {
    try {
        const eventId = formData.get('event_id') as string;
        const facultyId = formData.get('faculty_id') as string;
        const studentId = formData.get('student_id') as string;
        const startTime = formData.get('start_time') as string;
        const endTime = formData.get('end_time') as string;
        const source = formData.get('source') as string || 'MANUAL';

        if (!eventId || !facultyId || !studentId || !startTime || !endTime) {
            return { error: 'Missing required fields' };
        }

        const client = new Client({ connectionString: process.env.NEON_POSTGRES_URL });
        await client.connect();

        try {
            // Convert Central Time input to UTC for database storage
            // The form provides times in Central Time, but we need to store them as UTC
            console.log('🔍 Converting Central Time to UTC for storage:');
            console.log('  - startTime (CT):', startTime);
            console.log('  - endTime (CT):', endTime);

            // Parse the datetime-local input (format: YYYY-MM-DDTHH:MM)
            const startDate = new Date(startTime);
            const endDate = new Date(endTime);

            // Convert to UTC using the helper function
            const startTimeUTC = convertCentralTimeToUTC(startDate);
            const endTimeUTC = convertCentralTimeToUTC(endDate);

            console.log('  - startTime (UTC):', startTimeUTC);
            console.log('  - endTime (UTC):', endTimeUTC);

            await client.query(
                'INSERT INTO meetings (event_id, faculty_id, student_id, start_time, end_time, source) VALUES ($1, $2, $3, $4::timestamp with time zone, $5::timestamp with time zone, $6)',
                [eventId, facultyId, studentId, startTimeUTC, endTimeUTC, source]
            );
        } finally {
            await client.end();
        }

        revalidatePath('/dashboard/meetings');
        return { success: true };
    } catch (error) {
        console.error('Error creating meeting:', error);
        return { error: 'Failed to create meeting' };
    }
}

export async function updateMeeting(formData: FormData) {
    try {
        const id = formData.get('id') as string;
        const eventId = formData.get('event_id') as string;
        const facultyId = formData.get('faculty_id') as string;
        const studentId = formData.get('student_id') as string;
        const startTime = formData.get('start_time') as string;
        const endTime = formData.get('end_time') as string;

        if (!id || !eventId || !facultyId || !studentId || !startTime || !endTime) {
            return { error: 'Missing required fields' };
        }

        const client = new Client({ connectionString: process.env.NEON_POSTGRES_URL });
        await client.connect();

        try {
            // Convert Central Time input to UTC for database storage
            const startDate = new Date(startTime);
            const endDate = new Date(endTime);

            // Convert to UTC using the helper function
            const startTimeUTC = convertCentralTimeToUTC(startDate);
            const endTimeUTC = convertCentralTimeToUTC(endDate);

            await client.query(
                'UPDATE meetings SET event_id = $1, faculty_id = $2, student_id = $3, start_time = $4::timestamp with time zone, end_time = $5::timestamp with time zone WHERE id = $6',
                [eventId, facultyId, studentId, startTimeUTC, endTimeUTC, id]
            );
        } finally {
            await client.end();
        }

        revalidatePath('/dashboard/meetings');
        return { success: true };
    } catch (error) {
        console.error('Error updating meeting:', error);
        return { error: 'Failed to update meeting' };
    }
}

export async function deleteMeeting(id: string) {
    try {
        if (!id) {
            return { error: 'Missing meeting id' };
        }

        const client = new Client({ connectionString: process.env.NEON_POSTGRES_URL });
        await client.connect();

        try {
            await client.query('DELETE FROM meetings WHERE id = $1', [id]);
        } finally {
            await client.end();
        }

        revalidatePath('/dashboard/meetings');
        return { success: true };
    } catch (error) {
        console.error('Error deleting meeting:', error);
        return { error: 'Failed to delete meeting' };
    }
}
