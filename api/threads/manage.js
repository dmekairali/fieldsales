
// /api/threads/manage.js
// Manage thread lifecycle in database

export async function saveThreadToDatabase(threadId, mrName, month, year, planId) {
    // Save thread info to your database
    const { data, error } = await supabase
        .from('monthly_plan_threads')
        .insert({
            thread_id: threadId,
            mr_name: mrName,
            plan_month: month,
            plan_year: year,
            monthly_plan_id: planId,
            status: 'ACTIVE',
            created_at: new Date().toISOString()
        });

    if (error) throw error;
    return data;
}

export async function getActiveThread(mrName, month, year) {
    const { data, error } = await supabase
        .from('monthly_plan_threads')
        .select('*')
        .eq('mr_name', mrName)
        .eq('plan_month', month)
        .eq('plan_year', year)
        .eq('status', 'ACTIVE')
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

// Utility functions
function cleanJsonResponse(response) {
    let cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace > 0) cleaned = cleaned.substring(firstBrace);
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace >= 0 && lastBrace < cleaned.length - 1) {
        cleaned = cleaned.substring(0, lastBrace + 1);
    }
    return cleaned;
}

async function waitForRunCompletion(threadId, runId) {
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
    while (runStatus.status === 'running' || runStatus.status === 'queued') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
    }
    if (runStatus.status !== 'completed') {
        throw new Error(`Assistant run failed with status: ${runStatus.status}`);
    }
    return runStatus;
}

function parseRevisionResponse(responseText) {
    // Parse revision response - could be partial or full plan
    try {
        return JSON.parse(cleanJsonResponse(responseText));
    } catch (error) {
        // If not JSON, return as text recommendations
        return { recommendations: responseText };
    }
}
