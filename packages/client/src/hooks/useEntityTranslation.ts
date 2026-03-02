import { useTranslation } from "react-i18next";
import { ModelMeta } from "@zenku/core";

export function useEntityTranslation() {
    const { t, i18n } = useTranslation();

    const tEntityName = (meta: ModelMeta) => {
        const key = `models.${meta.name}.name`;
        // 如果這個 key 在翻譯檔有定義
        if (i18n.exists(key)) {
            return t(key);
        }
        // 如果沒有定義，使用 ui.label 或原本的 meta.name
        return meta.ui?.label || meta.name;
    };

    const tEntityPlural = (meta: ModelMeta) => {
        const key = `models.${meta.name}.plural`;
        if (i18n.exists(key)) {
            return t(key);
        }
        // 預設 fallback 回原本定義的 plural
        return meta.plural;
    };

    const tEntityField = (meta: ModelMeta, fieldName: string) => {
        const key = `models.${meta.name}.fields.${fieldName}`;
        if (i18n.exists(key)) {
            return t(key);
        }
        // 預設 fallback：將 camelCase 首字母轉大寫作為標籤
        return fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    };

    return {
        tEntityName,
        tEntityPlural,
        tEntityField,
    };
}
