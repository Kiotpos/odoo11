odoo.define('pos_cutom_itgis', function (require) {
    "use strict";

    var screens = require('point_of_sale.screens');
    var core = require('web.core');
    var chrome = require('point_of_sale.chrome');
    var gui = require('point_of_sale.gui');
    var PosBaseWidget = require('point_of_sale.BaseWidget');

    var QWeb = core.qweb;
    var OrderHeaderWidget = screens.ActionButtonWidget.extend({
		template : 'OrderHeaderWidget',
		button_click : function() {
		    this.gui.show_popup('cash_operation_popup', {
		    	button: this,
		    	title: "Them Ban",
		    	msg: 'Fill in this form if you put money in the cash register: ',
		    	operation: "put_money",
		    });
		}
	});
    screens.define_action_button({
		'name' : 'themban',
		'widget' : OrderHeaderWidget,
		'condition': function(){ return this.pos.config.enable_them_ban && this.pos.config.cash_control; },
	});
    screens.OrderWidget.include({
        update_summary: function(){
            var order = this.pos.get_order();
            if (!order.get_orderlines().length) {
                return;
            }

            var total     = order ? order.get_total_with_tax() : 0;
            var taxes     = order ? total - order.get_total_without_tax() : 0;

            this.el.querySelector('.order-total .label').textContent = this.format_currency(total, 0);
            this.el.querySelector('.summary .total > .value').textContent = this.format_currency_no_symbol(total, 0);
            this.el.querySelector('.summary .total .subentry .value').textContent = this.format_currency_no_symbol(taxes, 0);
        },

        render_orderline: function(orderline){
            var el_str  = QWeb.render('Orderline',{widget:this, line:orderline});
            var el_node = document.createElement('div');
                el_node.innerHTML = _.str.trim(el_str);
                el_node = el_node.childNodes[0];
                el_node.orderline = orderline;
                el_node.addEventListener('click',this.line_click_handler);

            var el_lot_icon = el_node.querySelector('.line-lot-icon');
            if(el_lot_icon){
                el_lot_icon.addEventListener('click', (function() {
                    this.show_product_lot(orderline);
                }.bind(this)));
            }

            var order = this.pos.get_order();

            var el_remove_order = el_node.querySelector('.line-remove-order');
            if(el_remove_order){
                el_remove_order.addEventListener('click', (function() {
                    this.gui.show_popup('confirm', {
                        'title': 'Bạn có chắc chắn muốn xóa không?',
                        confirm: function(){
                            order.remove_orderline(orderline);
                        },
                    });
                }.bind(this)));
            }

            var el_qty = el_node.querySelector('.line-qty');
            if(el_qty){
                el_qty.addEventListener('click', (function() {
                    this.gui.show_popup('number',{
                        'title': 'Số lượng',
                        'confirm': function(val) {
                            order.get_selected_orderline().set_quantity(val);
                        },
                    });
                }.bind(this)));
            }

            var el_discount = el_node.querySelector('.line-discount');
            if(el_discount){
                el_discount.addEventListener('click', (function() {
                    var self = this;
                    this.gui.show_popup('number',{
                        'title': 'Chiết khấu',
                        'confirm': function(val) {
                            if(val > 100) {
                                "TODO"
                                order.get_selected_orderline().set_unit_price(val);
                            } else {
                                order.get_selected_orderline().set_discount(val);
                            }
                        },
                    });
                }.bind(this)));
            }

            orderline.node = el_node;
            return el_node;
        },
    });

    screens.ProductScreenWidget.include({
        start: function(){
            this._super.apply(this, arguments);

            var el_action_print = this.el.querySelector('.order-action-print');
            if(el_action_print){
                el_action_print.addEventListener('click', (function() {
                    var order = this.pos.get_order();
                    if (order.get_orderlines().length) {
                        var data = {
                            widget: this,
                            pos: this.pos,
                            order: order,
                            receipt: order.export_for_printing(),
                            orderlines: order.get_orderlines(),
                            paymentlines: order.get_paymentlines(),
                        };
                        var receipt = QWeb.render('XmlReceipt', data);
                        this.pos.proxy.print_receipt(receipt);
                        this.pos.get_order()._printed = true;
                    }
                }.bind(this)));
            }

            var el_action_payment = this.el.querySelector('.order-action-payment');
            if(el_action_payment){
                el_action_payment.addEventListener('click', (function() {
                    var order = this.pos.get_order();
                    if (order.get_orderlines().length) {
                        this.gui.show_screen('payment');
                    }
                }.bind(this)));
            }
        },
    });

//    var OrderHeaderWidget = PosBaseWidget.extend({
//        template: 'OrderHeaderWidget',
//        init: function(parent, options){
//            options = options || {};
//            this._super(parent,options);
//        },
//
//        start: function(){
//            var self = this;
//            this._super();
//            this.$('.table-number').click(function() {
//                self.gui.show_popup('number',{
//                    'title': 'Chọn bàn',
//                    'confirm': function(val) {
//                        self.$('.table-number').text(val);
//                    },
//                });
//            });
//
//            this.$('.order-select-customer').click(function() {
//                 self.gui.show_screen('clientlist');
//            });
//        },
//    });

//    chrome.Chrome.include({
//        build_widgets: function(){
//            this.widgets.push({
//                'name':  'orderheader',
//                'widget': OrderHeaderWidget,
//                'replace': '.placeholder-OrderHeaderWidget',
//            });
//            this._super();
//        },
//    });

    screens.ClientListScreenWidget.include({
        save_changes: function(){
            this._super();
            var client = this.pos.get_client();
            $('.order-select-customer').text( client ? client.name : 'Khách lẻ' );
        },
    });

    return {
        OrderHeaderWidget: OrderHeaderWidget
    };
});
