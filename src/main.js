import Vue from 'vue'
import App from './components/App.vue'
import router from './router'
import axios from 'axios'
import TruffleContract from 'truffle-contract'

import VueMaterial from 'vue-material'
import 'vue-material/dist/vue-material.min.css'
import 'vue-material/dist/theme/default.css'

Vue.use(VueMaterial)

Vue.config.devtools = true
Vue.config.productionTip = false
Vue.prototype.$http = axios

Vue.filter('truncate', function (text, length, suffix) {
  if (text.length > length) {
      return text.substring(0, length) + suffix;
  } else {
      return text;
  }
});

/* eslint-disable no-new */

new Vue({
  el: '#app',
  router,
  components: { App },
  created: async function () {
    await this.initWeb3();
    await this.initContract();
    await this.initAddress();
    this.fetchProperties();
    this.fetchPropertiesForSale();

    this.$root.$on('connect-to-account', () => {})
    this.$root.$on('buy-ip', async (fingerprint, price) => {
      await this.buyProperty(fingerprint, price);
      this.fetchProperties();
    })
    this.$root.$on('offer-ip-for-sell', async ({ fingerprint, price }) => {
      await this.offerPropertyForSale(fingerprint, price);
      this.fetchPropertiesForSale();
    })
    this.$root.$on('add-fingerprint', (file, title) => {
      this.calculateFingerprint(file, title);
    })
    this.$root.$on('change-property-to-sell', (fingerprint, minPrice, expiry) => {
      console.log('change-property-to-sell');
    })
    this.$root.$on('remove-from-to-sell', (fingerprint) => {
      console.log('remove-from-to-sell');
    })
  },
  data() {
    return {
      web3Provider: null,
      web3: null,
      account: null,
      contracts: {},
      ownProperties: [],
      propertiesForSell: [],
      ownAuctions: [
        {fingerprint: 'xyz', title: 'title 1', minPrice: 2, highestOffer: 1.5, expiry: '10.07.2020'},
        {fingerprint: 'xyzy', title: 'title 2', minPrice: 3, highestOffer: 4, expiry: '10.07.2020'},
      ],
      auctions: [
        {fingerprint: 'sdgfsf', title: 'title 3', minPrice: 2, highestOffer: 1, expiry: '10.07.2020'},
        {fingerprint: 'fdgsdfg', title: 'title 4', minPrice: 1, highestOffer: 2, expiry: '10.07.2020'},
        {fingerprint: 'rdgthxyz', title: 'title 5', minPrice: 1.5, highestOffer: 6, expiry: '10.07.2020'},
        {fingerprint: 'xyhgfhhzy', title: 'title 6', minPrice: 3.2, highestOffer: 5, expiry: '10.07.2020'},
        {fingerprint: 'xdfgfgyz', title: 'title 7', minPrice: 2.5, highestOffer: 2, expiry: '10.07.2020'},
        {fingerprint: 'xyzloly', title: 'title 8', minPrice: 6, highestOffer: 4, expiry: '10.07.2020'},
      ]
    }
  },
  methods: {
    async initWeb3() {
      if (window.ethereum) {
        this.web3Provider = window.ethereum;
        try {
          // Request account access
          await window.ethereum.enable();
        } catch (error) {
          // User denied account access...
          console.error("User denied account access");
        }
      }
      // Legacy dapp browsers...
      else if (window.web3) {
        this.web3Provider = window.web3.currentProvider;
      }
      // If no injected web3 instance is detected, fall back to Ganache
      else {
        this.web3Provider = new Web3.providers.HttpProvider(
          "http://localhost:7545"
        );
      }
      web3 = new Web3(this.web3Provider);
    },
    async initContract() {
      // Get the necessary contract artifact file and instantiate it with @truffle/contract
      await $.getJSON("/static/PropertiesDB.json", (data) => {
        this.contracts.propertiesDB = TruffleContract(data);
        this.contracts.propertiesDB.setProvider(this.web3Provider);
      });
    },
    initAddress() {
      web3.eth.getAccounts((error, accounts) => {
        this.account = accounts[0]
        if (error) {
          console.log(error);
        }
      });
    },
    calculateFingerprint(file, title) {
      const baseURI = 'http://localhost:3000/';
      var formData = new FormData();
      formData.append("song", file);

      this.$http.post(baseURI, formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }).then(data => {
          const fingerprint = data.data.data.fingerprint;
          let ipDb;
          const account = this.$root.$data.account;
          this.contracts.propertiesDB.deployed().then((instance) => {
            return instance.addProperty(fingerprint, title, { from: account });
          }).then((result) => {
            this.fetchProperties();
          }).catch((error) => {
              console.log(error);
            });
        });
    },
    fetchProperties() {
      this.contracts.propertiesDB.deployed().then((instance)  => {
        return instance.fetchProperties({ from: this.account })
      }).then((result) => {
          this.ownProperties = result;
        })
    },
    fetchPropertiesForSale(callBack) {
      this.contracts.propertiesDB.deployed().then((instance)  => {
        return instance.fetchPropertiesForSale({ from: this.account })
      }).then((result) => {
          this.propertiesForSell = result;
          if (typeof callBack !== 'undefined' && callBack != null) {
            callBack();
          }
        })
    },
    async buyProperty(fingerprint, price) {
      await this.contracts.propertiesDB.deployed().then(async (instance)  => {
        return await instance.buyProperty(fingerprint, { from: this.account, value: price });
      }).then(() => {
        this.fetchPropertiesForSale(this.fetchProperties);
      })
    },
    async offerPropertyForSale(fingerprint, price) {
      await this.contracts.propertiesDB.deployed().then(async (instance)  => {
        return await instance.offerPropertyForSale(fingerprint, price, { from: this.account })
      })
    },
  },
  template: '<App />'
})
