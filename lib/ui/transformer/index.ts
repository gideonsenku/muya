import "./index.css";
import Muya from "../../index";

const CIRCLES = ["top-left", "top-right", "bottom-left", "bottom-right"];

const CIRCLE_RADIO = 6;

class Transformer {
  static pluginName = "transformer";
  private reference: any;
  private block: any;
  private imageInfo: any;
  private movingAnchor: any;
  private status: boolean;
  private width: any;
  private eventId: any[];
  private lastScrollTop: any;
  private resizing: boolean;
  private container: HTMLDivElement;

  constructor(public muya: Muya) {
    this.reference = null;
    this.block = null;
    this.imageInfo = null;
    this.movingAnchor = null;
    this.status = false;
    this.width = null;
    this.eventId = [];
    this.lastScrollTop = null;
    this.resizing = false;

    const container = (this.container = document.createElement("div"));
    container.classList.add("mu-transformer");
    document.body.appendChild(container);

    this.listen();
  }

  listen() {
    const { eventCenter, domNode } = this.muya;

    const scrollHandler = (event) => {
      if (typeof this.lastScrollTop !== "number") {
        this.lastScrollTop = event.target.scrollTop;

        return;
      }

      // only when scroll distance great than 50px, then hide the float box.
      if (
        !this.resizing &&
        this.status &&
        Math.abs(event.target.scrollTop - this.lastScrollTop) > 50
      ) {
        this.hide();
      }
    };

    eventCenter.on("muya-transformer", ({ block, reference, imageInfo }) => {
      this.reference = reference;
      if (reference) {
        this.block = block;
        this.imageInfo = imageInfo;
        setTimeout(() => {
          this.render();
        });
      } else {
        this.hide();
      }
    });

    eventCenter.attachDOMEvent(document, "click", this.hide.bind(this));
    eventCenter.attachDOMEvent(domNode, "scroll", scrollHandler);
    eventCenter.attachDOMEvent(this.container, "dragstart", (event) =>
      event.preventDefault()
    );
    eventCenter.attachDOMEvent(document.body, "mousedown", this.mouseDown);
  }

  render() {
    const { eventCenter } = this.muya;
    if (this.status) {
      this.hide();
    }
    this.status = true;

    this.createElements();
    this.update();
    eventCenter.emit("muya-float", this, true);
  }

  createElements() {
    CIRCLES.forEach((c) => {
      const circle = document.createElement("div");
      circle.classList.add("circle");
      circle.classList.add(c);
      circle.setAttribute("data-position", c);
      this.container.appendChild(circle);
    });
  }

  update() {
    const rect = this.reference.getBoundingClientRect();
    CIRCLES.forEach((c) => {
      const circle: HTMLDivElement = this.container.querySelector(`.${c}`);

      switch (c) {
        case "top-left":
          circle.style.left = `${rect.left - CIRCLE_RADIO}px`;
          circle.style.top = `${rect.top - CIRCLE_RADIO}px`;
          break;

        case "top-right":
          circle.style.left = `${rect.left + rect.width - CIRCLE_RADIO}px`;
          circle.style.top = `${rect.top - CIRCLE_RADIO}px`;
          break;

        case "bottom-left":
          circle.style.left = `${rect.left - CIRCLE_RADIO}px`;
          circle.style.top = `${rect.top + rect.height - CIRCLE_RADIO}px`;
          break;

        case "bottom-right":
          circle.style.left = `${rect.left + rect.width - CIRCLE_RADIO}px`;
          circle.style.top = `${rect.top + rect.height - CIRCLE_RADIO}px`;
          break;
      }
    });
  }

  mouseDown = (event) => {
    const target = event.target;
    if (!target.closest(".circle")) {
      return;
    }

    const { eventCenter } = this.muya;
    this.movingAnchor = target.getAttribute("data-position");
    const mouseMoveId = eventCenter.attachDOMEvent(
      document.body,
      "mousemove",
      this.mouseMove
    );
    const mouseUpId = eventCenter.attachDOMEvent(
      document.body,
      "mouseup",
      this.mouseUp
    );
    this.resizing = true;
    // Hide image toolbar
    eventCenter.emit("muya-image-toolbar", { reference: null });
    this.eventId.push(mouseMoveId, mouseUpId);
  };

  mouseMove = (event) => {
    event.preventDefault();
    const clientX = event.clientX;
    let width;
    let relativeAnchor;
    const image = this.reference.querySelector("img");
    if (!image) {
      return;
    }

    switch (this.movingAnchor) {
      case "top-left":
        // fallsthrough
      case "bottom-left":
        relativeAnchor = this.container.querySelector(".top-right");
        width = Math.max(
          relativeAnchor.getBoundingClientRect().left + CIRCLE_RADIO - clientX,
          50
        );
        break;

      case "top-right":
        // fallsthrough
      case "bottom-right":
        relativeAnchor = this.container.querySelector(".top-left");
        width = Math.max(
          clientX - relativeAnchor.getBoundingClientRect().left - CIRCLE_RADIO,
          50
        );
        break;
    }
    // Image width/height attribute must be an integer.
    width = parseInt(width);
    this.width = width;
    image.setAttribute("width", width);
    this.update();
  };

  mouseUp = (event) => {
    event.preventDefault();
    const { eventCenter } = this.muya;
    if (this.eventId.length) {
      for (const id of this.eventId) {
        eventCenter.detachDOMEvent(id);
      }
      this.eventId = [];
    }

    // todo update data
    if (typeof this.width === "number") {
      this.block.updateImage(this.imageInfo, "width", this.width);
      this.width = null;
      this.hide();
    }
    this.resizing = false;
    this.movingAnchor = null;
  };

  hide() {
    const { eventCenter } = this.muya;
    const circles = this.container.querySelectorAll(".circle");
    Array.from(circles).forEach((c) => c.remove());
    this.status = false;
    eventCenter.emit("muya-float", this, false);
  }
}

export default Transformer;
