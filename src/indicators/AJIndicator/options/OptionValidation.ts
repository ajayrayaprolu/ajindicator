import {
    OptionValidationEngine
}
from "./OptionValidationEngine";

import type {
    OptionValidationInput
}
from "./OptionValidationTypes";

import type {
    OptionValidationResult
}
from "./OptionValidationResult";

export class OptionValidation {

    //--------------------------------------------------
    // VALIDATE
    //--------------------------------------------------

    static evaluate(

        input: OptionValidationInput

    ): OptionValidationResult {

        return OptionValidationEngine.calculate(

            input

        );

    }

}

