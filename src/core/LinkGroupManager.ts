//==========================================
// \src\core\LinkGroupManager.ts
//==========================================

export class LinkGroupManager {

  private static groups =
    new Map<number, string>();

  static setGroup(
    chartId: number,
    group: string
  ) {

    this.groups.set(
      chartId,
      group
    );

  }

  static getGroup(
    chartId: number
  ) {

    return (
      this.groups.get(
        chartId
      ) || ""
    );

  }

  static getLinkedCharts(
    chartId: number
  ) {

    const group =
      this.getGroup(
        chartId
      );

    if (!group) {
      return [];
    }

    const ids: number[] = [];

    this.groups.forEach(
      (
        value,
        id
      ) => {

        if (
          value === group
        ) {

          ids.push(id);

        }

      }
    );

    return ids;

  }

}
