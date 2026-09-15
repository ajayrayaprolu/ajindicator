export interface Plot {

  id: string;

  label: string;

  color: string;

  values: {

    time: number;

    value: number;

  }[];

}

