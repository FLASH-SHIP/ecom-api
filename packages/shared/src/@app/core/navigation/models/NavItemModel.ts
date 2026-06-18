import _ from "lodash";
import type { PartialDeep } from "type-fest";
import type { NavItemType } from "../types/NavItemType";

/**
 *  NavItemModel
 *  Constructs a navigation item based on NavItemType
 */
function NavItemModel(data: PartialDeep<NavItemType> = {}): NavItemType {
  return _.defaults(data, {
    id: _.uniqueId(),
    title: "",
    translate: "",
    auth: null,
    subtitle: "",
    icon: "",
    iconClass: "",
    url: "",
    target: "",
    type: "item",
    sx: {},
    disabled: false,
    active: false,
    exact: false,
    end: false,
    badge: null,
    children: [],
  }) as NavItemType;
}

export default NavItemModel;
