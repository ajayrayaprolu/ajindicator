//=======================================
// src/components/settings/ADXSettings.tsx
//========================================

interface Props {

    onClose: () => void;

}

export default function ADXSettings({

    onClose

}: Props) {

    return (

        <div>

            ADX SETTINGS

            <br/>

            <button onClick={onClose}>

                Close

            </button>

        </div>

    );

}