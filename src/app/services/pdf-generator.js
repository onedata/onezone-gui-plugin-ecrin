import Service from '@ember/service';
import { resolve, Promise } from 'rsvp';
import { get } from '@ember/object';
import I18n from 'onezone-gui-plugin-ecrin/mixins/i18n';

const scriptsToLoad = [
  'assets/pdfmake/pdfmake.js',
  'assets/pdfmake/vfs_fonts.js',
];

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
      return this.set(
        'loadingPdfmakePromise',
        new Promise((resolveLoad, rejectLoad) =>
          this.loadChainedLibs(scriptsToLoad, resolveLoad, rejectLoad)
        )
      );
    }
  },

  /**
   * Loads scripts specified by first arguments one by another (second is getting
   * loaded only when the first one finished and so on).
   * @param {Array<string>} scriptsToLoad paths to scripts, that should be loaded
   * @param {Function} resolveLoad resolve promise callback. Should accepts makePdf
   *   as an argument
   * @param {Function} rejectLoad reject promise callback
   * @returns {undefined}
   */
  loadChainedLibs(scriptsToLoad, resolveLoad, rejectLoad) {
    const nextScript = scriptsToLoad[0];
    const scriptNode = document.createElement('script');
    scriptNode.src = nextScript;
    scriptNode.addEventListener('load', () => {
      if (scriptsToLoad.length > 1) {
        this.loadChainedLibs(scriptsToLoad.slice(1), resolveLoad, rejectLoad);
      } else {
        resolveLoad(window.pdfMake);
      }
    });
    scriptNode.addEventListener('error', event => {
      console.error('Cannot load makepdf library:', event);
      rejectLoad(this.t('cannotLoadLibraryError'));
    });
    document.getElementsByTagName('body')[0].appendChild(scriptNode);
  },

  /**
   * Generates PDF documents from passed array of studies with data objects
   * @param {Array<Utils.Study>} results
   * @returns {Promise}
   */
  generatePdfFromResults(results) {
    return this.loadPdfMake()
      .then(pdfMake => {
        const studyTables = results.map(study => {
          return {
            style: 'studyTable',
            table: {
              headerRows: 1,
              widths: [200, '*'],
              body: [
                [{ text: get(study, 'title'), colSpan: 2 }, {}],
              ],
            },
          };
        });
        const docDefinition = {
          content: [
            ...studyTables,
          ],
          styles: {
            studyTable: {
              margin: [0, 5, 0, 15],
            },
          },
        };
        pdfMake.createPdf(docDefinition).open();
      });
  },
});
