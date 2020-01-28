import Service from '@ember/service';
import { resolve, Promise } from 'rsvp';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';

export default Service.extend(I18n, {
  /**
   * @override
   */
  i18nPrefix: 'services.pdfGenerator',

  /**
   * @type {pdfMake}
   */
  pdfMake: null,

  /**
   * @type {Promise<pdfMake>}
   */
  loadingPdfMakePromise: null,

  /**
   * @returns {Promise<pdfMake>}
   */
  loadPdfMake() {
    const {
      loadingPdfmakePromise,
      pdfMake,
    } = this.getProperties('loadingPdfmakePromise', 'pdfMake');

    if (pdfMake) {
      return resolve(pdfMake);
    } else if (loadingPdfmakePromise) {
      return loadingPdfmakePromise;
    } else if (window.pdfMake) {
      this.set('pdfMake', window.pdfMake);
      return resolve(window.pdfMake);
    } else {
      const loadingPdfmakePromise = new Promise((resolveLoad, rejectLoad) => {
        const scriptNode = document.createElement('script');
        scriptNode.src = 'assets/pdfmake.js';
        scriptNode.addEventListener('load', () => {
          this.set('pdfMake', window.pdfMake);
          resolveLoad(window.pdfMake);
        });
        scriptNode.addEventListener('error', event => {
          console.error('Cannot load makepdf library:', event);
          rejectLoad(this.t('cannotLoadLibraryError'));
        });

        document.getElementsByTagName('body')[0].appendChild(scriptNode);
      });

      return this.set('loadingPdfmakePromise', loadingPdfmakePromise);
    }
  },
});
