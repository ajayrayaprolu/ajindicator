import type { IDataFeed }
from "../types/IDataFeed";

export class TwelveDataFeed
implements IDataFeed {

  async getHistory() {
    return [];
  }

}
