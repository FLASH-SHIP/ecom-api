/**
 * Inline Material Design color palette.
 * Only includes the 16 main colors used by randomMatColor().
 */
const materialColors: Record<string, Record<string, string>> = {
  red: {
    "50": "#FFEBEE",
    "100": "#FFCDD2",
    "200": "#EF9A9A",
    "300": "#E57373",
    "400": "#EF5350",
    "500": "#F44336",
    "600": "#E53935",
    "700": "#D32F2F",
    "800": "#C62828",
    "900": "#B71C1C",
    A100: "#FF8A80",
    A200: "#FF5252",
    A400: "#FF1744",
    A700: "#D50000",
  },
  pink: {
    "50": "#FCE4EC",
    "100": "#F8BBD0",
    "200": "#F48FB1",
    "300": "#F06292",
    "400": "#EC407A",
    "500": "#E91E63",
    "600": "#D81B60",
    "700": "#C2185B",
    "800": "#AD1457",
    "900": "#880E4F",
    A100: "#FF80AB",
    A200: "#FF4081",
    A400: "#F50057",
    A700: "#C51162",
  },
  purple: {
    "50": "#F3E5F5",
    "100": "#CE93D8",
    "200": "#CE93D8",
    "300": "#BA68C8",
    "400": "#AB47BC",
    "500": "#9C27B0",
    "600": "#8E24AA",
    "700": "#7B1FA2",
    "800": "#6A1B9A",
    "900": "#4A148C",
    A100: "#EA80FC",
    A200: "#E040FB",
    A400: "#D500F9",
    A700: "#AA00FF",
  },
  deepPurple: {
    "50": "#EDE7F6",
    "100": "#D1C4E9",
    "200": "#B39DDB",
    "300": "#9575CD",
    "400": "#7E57C2",
    "500": "#673AB7",
    "600": "#5E35B1",
    "700": "#512DA8",
    "800": "#4527A0",
    "900": "#311B92",
    A100: "#B388FF",
    A200: "#7C4DFF",
    A400: "#651FFF",
    A700: "#6200EA",
  },
  indigo: {
    "50": "#E8EAF6",
    "100": "#C5CAE9",
    "200": "#9FA8DA",
    "300": "#7986CB",
    "400": "#5C6BC0",
    "500": "#3F51B5",
    "600": "#3949AB",
    "700": "#303F9F",
    "800": "#283593",
    "900": "#1A237E",
    A100: "#8C9EFF",
    A200: "#536DFE",
    A400: "#3D5AFE",
    A700: "#304FFE",
  },
  blue: {
    "50": "#E3F2FD",
    "100": "#BBDEFB",
    "200": "#90CAF9",
    "300": "#64B5F6",
    "400": "#42A5F5",
    "500": "#2196F3",
    "600": "#1E88E5",
    "700": "#1976D2",
    "800": "#1565C0",
    "900": "#0D47A1",
    A100: "#82B1FF",
    A200: "#448AFF",
    A400: "#2979FF",
    A700: "#2962FF",
  },
  lightBlue: {
    "50": "#E1F5FE",
    "100": "#B3E5FC",
    "200": "#81D4FA",
    "300": "#4FC3F7",
    "400": "#29B6F6",
    "500": "#03A9F4",
    "600": "#039BE5",
    "700": "#0288D1",
    "800": "#0277BD",
    "900": "#01579B",
    A100: "#80D8FF",
    A200: "#40C4FF",
    A400: "#00B0FF",
    A700: "#0091EA",
  },
  cyan: {
    "50": "#E0F7FA",
    "100": "#B2EBF2",
    "200": "#80DEEA",
    "300": "#4DD0E1",
    "400": "#26C6DA",
    "500": "#00BCD4",
    "600": "#00ACC1",
    "700": "#0097A7",
    "800": "#00838F",
    "900": "#006064",
    A100: "#84FFFF",
    A200: "#18FFFF",
    A400: "#00E5FF",
    A700: "#00B8D4",
  },
  teal: {
    "50": "#E0F2F1",
    "100": "#B2DFDB",
    "200": "#80CBC4",
    "300": "#4DB6AC",
    "400": "#26A69A",
    "500": "#009688",
    "600": "#00897B",
    "700": "#00796B",
    "800": "#00695C",
    "900": "#004D40",
    A100: "#A7FFEB",
    A200: "#64FFDA",
    A400: "#1DE9B6",
    A700: "#00BFA5",
  },
  green: {
    "50": "#E8F5E9",
    "100": "#C8E6C9",
    "200": "#A5D6A7",
    "300": "#81C784",
    "400": "#66BB6A",
    "500": "#4CAF50",
    "600": "#43A047",
    "700": "#388E3C",
    "800": "#2E7D32",
    "900": "#1B5E20",
    A100: "#B9F6CA",
    A200: "#69F0AE",
    A400: "#00E676",
    A700: "#00C853",
  },
  lightGreen: {
    "50": "#F1F8E9",
    "100": "#DCEDC8",
    "200": "#C5E1A5",
    "300": "#AED581",
    "400": "#9CCC65",
    "500": "#8BC34A",
    "600": "#7CB342",
    "700": "#689F38",
    "800": "#558B2F",
    "900": "#33691E",
    A100: "#CCFF90",
    A200: "#B2FF59",
    A400: "#76FF03",
    A700: "#64DD17",
  },
  lime: {
    "50": "#F9FBE7",
    "100": "#F0F4C3",
    "200": "#E6EE9C",
    "300": "#DCE775",
    "400": "#D4E157",
    "500": "#CDDC39",
    "600": "#C0CA33",
    "700": "#AFB42B",
    "800": "#9E9D24",
    "900": "#827717",
    A100: "#F4FF81",
    A200: "#EEFF41",
    A400: "#C6FF00",
    A700: "#AEEA00",
  },
  yellow: {
    "50": "#FFFDE7",
    "100": "#FFF9C4",
    "200": "#FFF59D",
    "300": "#FFF176",
    "400": "#FFEE58",
    "500": "#FFEB3B",
    "600": "#FDD835",
    "700": "#FBC02D",
    "800": "#F9A825",
    "900": "#F57F17",
    A100: "#FFFF8D",
    A200: "#FFFF00",
    A400: "#FFEA00",
    A700: "#FFD600",
  },
  amber: {
    "50": "#FFF8E1",
    "100": "#FFECB3",
    "200": "#FFE082",
    "300": "#FFD54F",
    "400": "#FFCA28",
    "500": "#FFC107",
    "600": "#FFB300",
    "700": "#FFA000",
    "800": "#FF8F00",
    "900": "#FF6F00",
    A100: "#FFE57F",
    A200: "#FFD740",
    A400: "#FFC400",
    A700: "#FFAB00",
  },
  orange: {
    "50": "#FFF3E0",
    "100": "#FFE0B2",
    "200": "#FFCC80",
    "300": "#FFB74D",
    "400": "#FFA726",
    "500": "#FF9800",
    "600": "#FB8C00",
    "700": "#F57C00",
    "800": "#EF6C00",
    "900": "#E65100",
    A100: "#FFD180",
    A200: "#FFAB40",
    A400: "#FF9100",
    A700: "#FF6D00",
  },
  deepOrange: {
    "50": "#FBE9E7",
    "100": "#FFCCBC",
    "200": "#FFAB91",
    "300": "#FF8A65",
    "400": "#FF7043",
    "500": "#FF5722",
    "600": "#F4511E",
    "700": "#E64A19",
    "800": "#D84315",
    "900": "#BF360C",
    A100: "#FF9E80",
    A200: "#FF6E40",
    A400: "#FF3D00",
    A700: "#DD2C00",
  },
};

import _ from "lodash";
import type { DeepPartial } from "react-hook-form";
import type { PartialDeep } from "type-fest";
import type { User } from "../../@auth/user";
import type { AppSettingsConfigType } from "../core/AppSettings/AppSettings";
import EventEmitter from "./EventEmitter";

type TreeNode = {
  id: string;
  children?: TreeNode[];
};
/**
 * The AppRouteItemType type
 */
export type AppRouteItemType = {
  path?: string;
  element?: React.ReactNode;
  auth?: string[] | [];
  settings?: DeepPartial<AppSettingsConfigType>;
  children?: AppRouteItemType[];
};

/**
 * The AppRoutesType type is a custom type that is an array of AppRouteItemType objects.
 */
export type AppRoutesType = AppRouteItemType[];

/**
 * The AppRouteConfigType type is a custom type that defines the configuration for a set of routes.
 * It includes an optional routes property, an optional settings property, and an optional auth property.
 */
export type AppRouteConfigType = {
  routes: AppRoutesType;
  settings?: PartialDeep<AppSettingsConfigType>;
  auth?: string[] | [];
};

/**
 * The AppRouteConfigsType type is a custom type that is an array of AppRouteConfigType objects.
 */
export type AppRouteConfigsType = AppRouteConfigType[] | [];

/**
 * The hueTypes type is a custom type that defines the possible values for a hue.
 */
type hueTypes =
  | "50"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900"
  | "A100"
  | "A200"
  | "A400"
  | "A700";

type Color = {
  50?: string;
  100?: string;
  200?: string;
  300?: string;
  400?: string;
  500?: string;
  600?: string;
  700?: string;
  800?: string;
  900?: string;
  A100?: string;
  A200?: string;
  A400?: string;
  A700?: string;
  [key: string]: string | undefined;
};

/**
 * The appUtils class provides utility functions for the project.
 */
class appUtils {
  /**
   * The filterArrayByString function filters an array of objects by a search string.
   * It takes in an array of objects and a search string as parameters and returns a filtered array of objects.
   *
   */

  static filterArrayByString<T>(mainArr: T[], searchText: string): T[] {
    if (!searchText || searchText?.length === 0 || !searchText) {
      return mainArr; // Return the original array
    }

    searchText = searchText?.toLowerCase();
    const filtered = mainArr.filter((itemObj) => appUtils.searchInObj(itemObj, searchText));

    if (filtered.length === mainArr.length) {
      return mainArr; // If the filtered array is identical, return the original
    }

    return filtered;
  }

  static filterArrayByString2<T>(mainArr: T[], searchText: string): T[] {
    if (typeof searchText !== "string" || searchText === "") {
      return mainArr;
    }

    searchText = searchText?.toLowerCase();

    return mainArr.filter((itemObj: unknown) => appUtils.searchInObj(itemObj, searchText));
  }

  /**
   * The searchInObj function searches an object for a given search string.
   * It takes in an object and a search string as parameters and returns a boolean indicating whether the search string was found in the object.
   *
   */
  static searchInObj(itemObj: unknown, searchText: string) {
    if (!isRecord(itemObj)) {
      return false;
    }

    const propArray = Object.keys(itemObj);

    function isRecord(value: unknown): value is Record<string, unknown> {
      return Boolean(
        value && typeof value === "object" && !Array.isArray(value) && typeof value !== "function",
      );
    }

    for (const prop of propArray) {
      const value = itemObj[prop];

      if (typeof value === "string") {
        if (appUtils.searchInString(value, searchText)) {
          return true;
        }
      } else if (Array.isArray(value)) {
        if (appUtils.searchInArray(value, searchText)) {
          return true;
        }
      }

      if (typeof value === "object") {
        if (appUtils.searchInObj(value, searchText)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * The searchInArray function searches an array for a given search string.
   * It takes in an array and a search string as parameters and returns a boolean indicating whether the search string was found in the array.
   *
   */
  static searchInArray(arr: unknown[], searchText: string) {
    arr.forEach((value) => {
      if (typeof value === "string") {
        if (appUtils.searchInString(value, searchText)) {
          return true;
        }
      }

      if (value && typeof value === "object") {
        if (appUtils.searchInObj(value, searchText)) {
          return true;
        }
      }

      return false;
    });
    return false;
  }

  /**
   * The searchInString function searches a string for a given search string.
   * It takes in a string and a search string as parameters and returns a boolean indicating whether the search string was found in the string.
   *
   */
  static searchInString(value: string, searchText: string) {
    return value.toLowerCase().includes(searchText);
  }

  /**
   * The generateGUID function generates a globally unique identifier.
   * It returns a string representing the GUID.
   *
   */
  static generateGUID(): string {
    function S4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }

    return S4() + S4();
  }

  /**
   * The toggleInArray function toggles an item in an array.
   */
  static toggleInArray(item: unknown, array: unknown[]) {
    if (array.indexOf(item) === -1) {
      array.push(item);
    } else {
      array.splice(array.indexOf(item), 1);
    }
  }

  /**
   * The handleize function converts a string to a handle.
   */
  static handleize(text: string) {
    return text
      .toString()
      .toLowerCase()
      .replace(/\s+/g, "-") // Replace spaces with -
      .replace(/\W+/g, "") // Remove all non-word chars
      .replace(/--+/g, "-") // Replace multiple - with single -
      .replace(/^-+/, "") // Trim - from start of text
      .replace(/-+$/, ""); // Trim - from end of text
  }

  /**
   * The setRoutes function sets the routes for the project.
   */
  static setRoutes(
    config: AppRouteConfigType,
    defaultAuth: AppSettingsConfigType["defaultAuth"] = undefined,
  ): AppRouteItemType[] {
    let routes: AppRouteItemType[] = [];

    if (config?.routes) {
      routes = [...config.routes];
    }

    const applyAuth = (route: AppRouteItemType, parentAuth: string[] | null) => {
      const auth = route.auth || route.auth === null ? route.auth : parentAuth;
      const settings = _.merge({}, config.settings, route.settings);

      const newRoute = {
        ...route,
        settings,
        auth,
      };

      if (route.children) {
        newRoute.children = route.children.map((childRoute) => applyAuth(childRoute, auth));
      }

      return newRoute;
    };

    routes = routes.map((route) => {
      const auth = config.auth || config.auth === null ? config.auth : defaultAuth || null;
      return applyAuth(route, auth);
    }) as AppRouteItemType[];

    return [...routes];
  }

  /**
   * The generateRoutesFromConfigs function generates routes from a set of route configurations.
   * It takes in an array of route configurations as a parameter and returns an array of routes.
   *
   */
  static generateRoutesFromConfigs(
    configs: AppRouteConfigsType,
    defaultAuth: AppSettingsConfigType["defaultAuth"],
  ) {
    let allRoutes: AppRouteItemType[] = [];
    configs.forEach((config: AppRouteConfigType) => {
      allRoutes = [...allRoutes, ...appUtils.setRoutes(config, defaultAuth)];
    });
    return allRoutes;
  }

  /**
   * The findById function finds an object by its id.
   */
  static findById(tree: TreeNode[], idToFind: string): TreeNode | undefined {
    // Try to find the node at the current level
    const node = _.find(tree, { id: idToFind });

    if (node) {
      return node;
    }

    let foundNode: TreeNode | undefined;

    // If not found, search in the children using lodash's some for iteration
    _.some(tree, (item) => {
      if (item.children) {
        foundNode = appUtils.findById(item.children, idToFind);
        return foundNode; // If foundNode is truthy, _.some will stop iterating
      }

      return false; // Continue iterating
    });

    return foundNode;
  }

  /**
   * The randomMatColor function generates a random material color.
   */
  static randomMatColor(hue: hueTypes = "400") {
    const mainColors = [
      "red",
      "pink",
      "purple",
      "deepPurple",
      "indigo",
      "blue",
      "lightBlue",
      "cyan",
      "teal",
      "green",
      "lightGreen",
      "lime",
      "yellow",
      "amber",
      "orange",
      "deepOrange",
    ];

    const randomColor = mainColors[Math.floor(Math.random() * mainColors.length)];

    return (materialColors as unknown as Record<string, Color>)[randomColor][hue];
  }

  /**
   * The findNavItemById function finds a navigation item by its id.
   */
  static difference(
    object: Record<string, unknown>,
    base: Record<string, unknown>,
  ): Record<string, unknown> {
    function changes(
      _object: Record<string, unknown>,
      _base: Record<string, unknown>,
    ): Record<string, unknown> {
      return _.transform(
        _object,
        (result: Record<string, unknown>, value: unknown, key: string) => {
          if (!_.isEqual(value, _base[key])) {
            result[key] =
              _.isObject(value) && _.isObject(_base[key])
                ? changes(value as Record<string, unknown>, _base[key] as Record<string, unknown>)
                : value;
          }
        },
        {},
      );
    }

    return changes(object, base);
  }

  /**
   * The EventEmitter class is a custom implementation of an event emitter.
   * It provides methods for registering and emitting events.
   */
  static EventEmitter = EventEmitter;

  /**
   * The hasPermission function checks if a user has permission to access a resource.
   */
  static hasPermission(
    authArr: string[] | string | undefined,
    userPermissions: string[] | undefined,
    userRole?: User["role"],
  ): boolean {
    /**
     * If auth array is not defined
     * Pass and allow
     */
    if (authArr === null || authArr === undefined) {
      return true;
    }

    const authPermissions = Array.isArray(authArr) ? authArr : [authArr];

    if (authPermissions.length === 0) {
      /**
       * if auth array is empty means,
       * allow only user role is guest (null or empty[])
       */
      return !userRole || userRole.length === 0;
    }

    // 1. Check permission-based (PBAC) if permissions are provided
    if (userPermissions && Array.isArray(userPermissions)) {
      if (userPermissions.includes("*")) {
        return true;
      }
      return authPermissions.some((perm) => userPermissions.includes(perm));
    }

    // 2. Fallback to role-based (RBAC) check for backward compatibility
    if (userRole) {
      if (Array.isArray(userRole)) {
        return authPermissions.some((r) => userRole.includes(r));
      }
      if (typeof userRole === "string") {
        return authPermissions.includes(userRole);
      }
    }

    return false;
  }


  /**
   * The filterArrayByString function filters an array of objects by a search string.
   */
  static filterRecursive(data: [] | null, predicate: (arg0: unknown) => boolean) {
    // if no data is sent in, return null, otherwise transform the data
    return !data
      ? null
      : data.reduce((list: unknown[], entry: { children?: [] }) => {
          let clone: unknown = null;

          if (predicate(entry)) {
            // if the object matches the filter, clone it as it is
            clone = { ...entry };
          }

          if (entry.children != null) {
            // if the object has childrens, filter the list of children
            const children = appUtils.filterRecursive(entry.children, predicate);

            if (children && children?.length > 0) {
              // if any of the children matches, clone the parent object, overwrite
              // the children list with the filtered list
              clone = { ...entry, children };
            }
          }

          // if there's a cloned object, push it to the output list
          if (clone) {
            list.push(clone);
          }

          return list;
        }, []);
  }
}

export default appUtils;
