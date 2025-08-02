import { log } from './log';
type SchemaType =
    | 'string'
    | 'number'
    | 'boolean'
    | 'undefined'
    | [SchemaType]
    | [Schema];

type Schema = {
    [key: string]: SchemaType | Schema; // supporte objets imbriqués ou tableaux d'objets
};


/**
 * detect le type de l'object et renvoie son equivalent dans un schema
 * @param value la valeur de la quel on veut obtenir le type
 * @returns un type ou un schema de la valeur
 */
function detectType(value: any): SchemaType | Schema {
    if (typeof value === 'string') return 'string'; //si un string
    if (typeof value === 'number') return 'number'; //si un nombre
    if (typeof value === 'boolean') return 'boolean'; //si un bool

    //si un tableau
    if (Array.isArray(value)) {
        const first = value[0];
        //si valeur presente verifie sont type
        if (first !== undefined && first !== null) {
            //si tableau d'object refait un schema de l'object
            if (typeof first === 'object' && !Array.isArray(first)) {
                return [detectType(first) as Schema];
            }
            else {
                //obtien de le type de l'elment
                return [detectType(first) as SchemaType];
            }
        }
        else {
            //pas defini
            return ['undefined'];
        }

    }

    //si s'est un object et pas null
    if (typeof value === 'object' && value !== null) {
        //fait un schema avec tout les type detecter
        const schema: Schema = {};
        Object.keys(value).forEach(key => {
            schema[key] = detectType(value[key]);
        })
        return schema;
    }

    return 'undefined'; // fallback
}

/**
 * fait un schema d'un object fournit
 * @param sample object a schematiser
 * @returns le schema creez
 */
function generateSchemaFromSample(sample: any): SchemaType | Schema {
    //si pas un object
    if (typeof sample !== 'object' || sample === null || Array.isArray(sample)) {
        return detectType(sample);
    }

    //si un object
    const schema: Schema = {};
    for (const key in sample) {
        //regarde le type pour chaque valeur du sample
        schema[key] = detectType(sample[key]);
    }
    return schema;
}


function validateValue(value: any, typeDesc: SchemaType | Schema): any {
    // log("----------", "type", typeDesc);
    // log("val", value, "----------");
    //si s'est un seul element
    if (typeof typeDesc === 'string') {
        switch (typeDesc) {
            case 'string': return typeof value === 'string' ? value : null;
            case 'number': return typeof value === 'number' ? value : null;
            case 'boolean': return typeof value === 'boolean' ? value : null;
            case 'undefined': return value;
            default: return null;
        }
    }
    //si s'est un array
    else if (Array.isArray(typeDesc)) {
        if (Array.isArray(value)) {
            const itemSchema = typeDesc[0];
            var result: any[] = [];

            value.forEach(element => {
                result.push(validateValue(element, itemSchema));
            });
            return result;
        }

    }
    //si s'est un object
    else if (typeof typeDesc === 'object') {
        const result: any = {};
        for (const key in typeDesc) {
            result[key] = validateValue(value?.[key], typeDesc[key]);
        }
        return result;
    }

    return null;
}

/**
 * prend des valeurs brut fournit et un patern avec l'object a obtenir au niveau des type et cree un object avec les valeurs valide
 * @param raw object brut
 * @param patern l'object schema
 * @returns renvoie un object contenant les valeurs de brut correct selon le patern
 */
export function validate<T>(raw: any, patern: any): T {
    //genere un schema
    const schema = generateSchemaFromSample(patern);
    // log(schema);
    //renvoie l'object avec les bonne valeur
    return validateValue(raw, schema) as T;
}