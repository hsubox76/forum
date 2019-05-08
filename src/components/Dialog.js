import React, { Component } from "react";
import "../styles/Dialog.css";
import PropTypes from "prop-types";

class Dialog extends Component {
  static propTypes = {
    message: PropTypes.string,
    okText: PropTypes.string,
    cancelText: PropTypes.string,
    onClose: PropTypes.func,
    onOk: PropTypes.func,
    onCancel: PropTypes.func
  };
  static defaultProps = {
    message: "default message",
    okText: "ok",
    cancelText: "cancel",
    okClass: "edit",
    onClose: () => {},
    onOk: () => {},
    onCancel: () => {}
  };
  handleOkClick = () => {
    this.props.onOk();
    this.props.onClose();
  };
  handleCancelClick = () => {
    this.props.onCancel();
    this.props.onClose();
  };
  render() {
    return (
      <div className="dialog-container">
        <div className="dialog-box">
          <div className="dialog-message">{this.props.message}</div>
          <div className="dialog-buttons">
            <button className="button-cancel" onClick={this.handleCancelClick}>
              {this.props.cancelText}
            </button>
            <button
              className={"button-" + this.props.okClass}
              onClick={this.handleOkClick}
            >
              {this.props.okText}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default Dialog;
