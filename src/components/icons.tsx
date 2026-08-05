import { config, type IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faLock,
  faMagnifyingGlass,
  faBell,
  faInbox,
  faMasksTheater,
  faMapLocationDot,
  faHeart as fasHeart,
  faPaperPlane,
  faMusic,
  faUserTag,
  faLocationDot,
  faSquarePollVertical,
  faLink,
  faImage,
  faEllipsis,
  faPlus,
  faHouse,
  faTableCellsLarge,
  faCircleCheck,
  faVideo,
  faFilm,
  faUsers,
  faTowerBroadcast,
  faCamera,
  faFire,
  faChevronDown,
  faMercury,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as farHeart, faComment, faBookmark } from "@fortawesome/free-regular-svg-icons";
import { faGoogle, faFacebookF, faXTwitter } from "@fortawesome/free-brands-svg-icons";

config.autoAddCss = false;

const base = "h-4 w-4";
const make =
  (icon: IconDefinition) =>
  ({ className = base }: { className?: string }) =>
    <FontAwesomeIcon icon={icon} className={className} />;

export const IconUser = make(faUser);
export const IconLock = make(faLock);
export const IconSearch = make(faMagnifyingGlass);
export const IconBell = make(faBell);
export const IconInbox = make(faInbox);
export const IconMasks = make(faMasksTheater);
export const IconMapPeople = make(faMapLocationDot);
export const IconHeart = make(farHeart);
export const IconHeartFill = make(fasHeart);
export const IconComment = make(faComment);
export const IconShare = make(faPaperPlane);
export const IconBookmark = make(faBookmark);
export const IconMusic = make(faMusic);
export const IconTag = make(faUserTag);
export const IconPin = make(faLocationDot);
export const IconPoll = make(faSquarePollVertical);
export const IconLink = make(faLink);
export const IconImage = make(faImage);
export const IconMore = make(faEllipsis);
export const IconPlus = make(faPlus);
export const IconGrid = make(faHouse);
export const IconTable = make(faTableCellsLarge);
export const IconVerified = make(faCircleCheck);
export const IconVideo = make(faVideo);
export const IconReels = make(faFilm);
export const IconUsers = make(faUsers);
export const IconLive = make(faTowerBroadcast);
export const IconCamera = make(faCamera);
export const IconFire = make(faFire);
export const IconChevronDown = make(faChevronDown);
export const IconMercury = make(faMercury);
export const IconGoogle = make(faGoogle);
export const IconFacebook = make(faFacebookF);
export const IconX = make(faXTwitter);
