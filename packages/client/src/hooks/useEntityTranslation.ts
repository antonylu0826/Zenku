import { useTranslation } from "react-i18next";
import type { ModelMeta, ExtendedModelMeta } from "@zenku/core";

export function useEntityTranslation() {
    const { t, i18n } = useTranslation();

    /** Get the i18n data from entity definition (P12 format) */
    const getEntityI18n = (meta: ModelMeta | ExtendedModelMeta) => {
        const extended = meta as ExtendedModelMeta;
        return extended.entity?.i18n?.[i18n.language] ?? extended.entity?.i18n?.en;
    };

    const tEntityName = (meta: ModelMeta | ExtendedModelMeta) => {
        // P12: check entity-level i18n first
        const entityI18n = getEntityI18n(meta);
        if (entityI18n?.caption) return entityI18n.caption;

        // Legacy: check i18n locale files
        const key = `models.${meta.name}.name`;
        if (i18n.exists(key)) {
            return t(key);
        }
        return meta.ui?.label || meta.name;
    };

    const tEntityPlural = (meta: ModelMeta | ExtendedModelMeta) => {
        // P12: check entity-level i18n first
        const entityI18n = getEntityI18n(meta);
        if (entityI18n?.plural) return entityI18n.plural;

        // Legacy: check i18n locale files
        const key = `models.${meta.name}.plural`;
        if (i18n.exists(key)) {
            return t(key);
        }
        return meta.plural;
    };

    const tEntityField = (meta: ModelMeta | ExtendedModelMeta, fieldName: string) => {
        // P12: check entity-level i18n first
        const entityI18n = getEntityI18n(meta);
        if (entityI18n?.fields?.[fieldName]) return entityI18n.fields[fieldName];

        // Legacy: check i18n locale files
        const key = `models.${meta.name}.fields.${fieldName}`;
        if (i18n.exists(key)) {
            return t(key);
        }
        return fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    };

    return {
        tEntityName,
        tEntityPlural,
        tEntityField,
    };
}
