const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function msUntilNext0830IST() {
    const now = Date.now();
    const istNow = new Date(now + IST_OFFSET_MS);

    let target = Date.UTC(
        istNow.getUTCFullYear(),
        istNow.getUTCMonth(),
        istNow.getUTCDate(),
        8, 30, 0, 0
    );

    if (target <= istNow.getTime()) {
        target += DAY_MS;
    }

    return target - istNow.getTime();
}

export function scheduleDailyAt0830IST(task) {
    let timer = null;
    let stopped = false;

    function scheduleNext() {
        if (stopped) return;

        timer = setTimeout(async () => {
            timer = null;

            try {
                await task();
            } catch (error) {
                console.error(
                    "[DAILY IST SCHEDULER] Refresh failed:",
                    error?.message ?? error
                );
            } finally {
                scheduleNext();
            }
        }, msUntilNext0830IST());

        if (timer.unref) timer.unref();
    }

    scheduleNext();

    return function stopDailySchedule() {
        stopped = true;

        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
    };
}
