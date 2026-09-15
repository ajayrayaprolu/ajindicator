export class ScanScheduler {

  private static timer:
    ReturnType<typeof setInterval> | null =
    null;

  static start(

    callback: () => void,

    intervalMs = 30000

  ) {

    this.stop();

    this.timer =
      setInterval(
        callback,
        intervalMs
      );

  }

  static stop() {

    if (this.timer) {

      clearInterval(
        this.timer
      );

      this.timer = null;

    }

  }

}
