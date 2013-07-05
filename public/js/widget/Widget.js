/**
 * Base widget
 *
 * @constructor
 */
function Widget() {
    /**
     * Url base of a long polling endpoint
     * @property urlBase
     * @type {string}
     */
    this.urlBase = "/stp-rtm/resources";
    /**
     * Hash string representing previous values of a response.
     * @property oldValueHash
     * @type {string}
     */
    this.oldValueHash = '';
}

/**
 * Common interface for custom widgets
 */
Widget.prototype = {

    /**
     * Prepares required properties
     */
    init: function () {
        var tpl;

        this.$widget = $(this.widget);
        tpl = $("#" + this.widget.id + "Tpl");
        this.template = tpl.html();
        tpl.remove();

        this.configName = "/" + this.configName;
        this.widgetId = "/" + this.widget.id;

        this.params = this.$widget.data('params');
    },

    /**
     * Renders template of a widget
     *
     * @param {Object} dataToBind Data object with all values for placeholders from a template
     */
    renderTemplate: function (dataToBind) {
        if (dataToBind !== undefined) {
            this.$widget.html(_.template(this.template, dataToBind));
        } else {
            this.$widget.html(this.template);
        }
    },

    /**
     * Starts long polling session
     */
    startListening: function () {
        this.init();

        this.fetchData();
    },

    fetchData: function () {
        var resp = $.ajax({
            dataType: "json",
            url: this.urlBase + this.configName + this.widgetId + this.oldValueHash
        });

        resp.success( this.fetchDataOnSuccess.bind(this) );
        resp.error( this.fetchDataOnError.bind(this) );

        resp.onreadystatechange = null;
        resp.abort = null;
        resp = null;
    },

    fetchDataOnSuccess: function(response) {
        setTimeout(function () {
            this.fetchData()
        }.bind(this), this.params.refreshRate * 1000);

        if (response.hash === undefined) {
            throw new Error('Widget ' + this.widgetId + ' did not return value hash');
        }


        if (this.oldValueHash != "/" + response.hash || this.oldValueHash == '') {
            this.oldValueHash = "/" + response.hash;
            this.handleResponse(response);
        }
    },

    fetchDataOnError: function(jqXHR, status, errorThrown) {
        /**
         * Scheduling next request for 10 times the normal refreshRate
         * to minimize the number of failed requests.
         */
        setTimeout(function () {
            this.fetchData()
        }.bind(this), this.params.refreshRate * 1000 * 10);

        var response = $.parseJSON(jqXHR.responseText).error;

        throw new Error(response.message + " (type: " + response.type + ")");
    },

    /**
     * Prepares values to bind for percentage difference
     *
     * @param {number} oldValue
     * @param {number} newValue
     * @returns {object}
     */
    setDifference: function (oldValue, newValue) {

        dataToBind = {};

        if ($.isNumeric(oldValue) && oldValue > 0 && $.isNumeric(newValue)) {

            var diff = newValue - oldValue;

            var percentageDiff = Math.round(Math.abs(diff) / oldValue * 100);

            dataToBind.oldValue = oldValue;

            if(percentageDiff > 0) {
                dataToBind.percentageDiff = percentageDiff;
            }

            if (diff > 0) {
                dataToBind.arrowClass = "icon-arrow-up";
            } else {
                dataToBind.arrowClass = "icon-arrow-down";
            }
        }

        return dataToBind;
    },
    /**
     * An abstract method invoked after each response from long polling server
     */
    handleResponse: function () {
        throw new Error('Method "handleResponse" must be implemented by concrete widget constructors');
    },

    checkThresholds: function(currentValue) {
        this.$widget.removeClass('thresholdCautionValue').removeClass('thresholdCriticalValue');

        if (typeof(this.params.thresholdComparator) != 'undefined') {
            if (this.params.thresholdComparator == 'lowerIsBetter') {
                if (this.$widget.attr('data-threshold-critical-value') && currentValue >= this.$widget.attr('data-threshold-critical-value')) {
                    this.$widget.addClass('thresholdCriticalValue');
                } else if (this.$widget.attr('data-threshold-caution-value') && currentValue >= this.$widget.attr('data-threshold-caution-value')) {
                    this.$widget.addClass('thresholdCautionValue');
                }
            }
            else {
                if (this.$widget.attr('data-threshold-critical-value') && currentValue < this.$widget.attr('data-threshold-critical-value')) {
                    this.$widget.addClass('thresholdCriticalValue');
                } else if (this.$widget.attr('data-threshold-caution-value') && currentValue < this.$widget.attr('data-threshold-caution-value')) {
                    this.$widget.addClass('thresholdCautionValue');
                }
            }
        }
    }
};