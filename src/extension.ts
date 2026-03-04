import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('clean-flow-mentor');

    function validarDocumento(document: vscode.TextDocument) {
        if (document.languageId !== 'javascript' && document.languageId !== 'php') {
            return;
        }

        const text = document.getText();
        const diagnostics: vscode.Diagnostic[] = [];

        const adicionarAviso = (match: RegExpExecArray, indexGrupo: number, mensagem: string, severidade: vscode.DiagnosticSeverity) => {
            const palavraErro = match[indexGrupo];
            const startPos = document.positionAt(match.index + match[0].indexOf(palavraErro));
            const endPos = document.positionAt(match.index + match[0].indexOf(palavraErro) + palavraErro.length);
            const range = new vscode.Range(startPos, endPos);
            diagnostics.push(new vscode.Diagnostic(range, mensagem, severidade));
        };

        const adicionarAvisoSimples = (match: RegExpExecArray, mensagem: string, severidade: vscode.DiagnosticSeverity) => {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);
            diagnostics.push(new vscode.Diagnostic(range, mensagem, severidade));
        };

        // REGRAS GERAIS (Ambos)
        // console.log
        const regexConsoleLog = /\bconsole\.log\b/g;
        let matchConsoleLog;
        while ((matchConsoleLog = regexConsoleLog.exec(text)) !== null) {
            // Trocado para Warning (Amarelo)
            adicionarAvisoSimples(matchConsoleLog, `Guia de Idiomas: 'console.log' detectado. Lembre-se de remover antes de enviar para produção.`, vscode.DiagnosticSeverity.Warning);
        }

        // localhost
        const regexLocalhost = /\blocalhost:[0-9]+\b/g;
        let matchLocalhost;
        while ((matchLocalhost = regexLocalhost.exec(text)) !== null) {
            // Trocado para Warning (Amarelo)
            adicionarAvisoSimples(matchLocalhost, `Guia de Idiomas: URL hardcoded 'localhost' detectada. Considere usar variáveis de ambiente.`, vscode.DiagnosticSeverity.Warning);
        }

        // 1. CLASSES -> PascalCase
        const regexClass = /\bclass\s+([a-zA-Z0-9_]+)/g;
        let matchClass;
        while ((matchClass = regexClass.exec(text)) !== null) {
            const className = matchClass[1];
            if (className.includes('_') || /^[a-z]/.test(className)) {
                // Trocado para Warning (Amarelo)
                adicionarAviso(matchClass, 1, `Guia de Idiomas: Classes devem usar PascalCase (ex: UserRegistration).`, vscode.DiagnosticSeverity.Warning);
            }
        }

        // 2. MÉTODOS / FUNÇÕES -> snake_case
        const regexFunc = /\bfunction\s+([a-zA-Z0-9_]+)\s*\(/g;
        let matchFunc;
        while ((matchFunc = regexFunc.exec(text)) !== null) {
            const funcName = matchFunc[1];
            if (/[A-Z]/.test(funcName)) {
                // Trocado para Warning (Amarelo)
                adicionarAviso(matchFunc, 1, `Guia de Idiomas: Funções devem usar snake_case (ex: validar_form).`, vscode.DiagnosticSeverity.Warning);
            }
        }

        // 3 e 5. VARIÁVEIS e CONSTANTES (JavaScript)
        if (document.languageId === 'javascript') {
            const regexLetVar = /\b(?:let|var)\s+([a-zA-Z0-9_$]+)/g;
            let matchLetVar;
            while ((matchLetVar = regexLetVar.exec(text)) !== null) {
                if (/[A-Z]/.test(matchLetVar[1])) {
                    // Trocado para Warning (Amarelo)
                    adicionarAviso(matchLetVar, 1, `Guia de Idiomas: Variáveis locais devem usar snake_case (ex: data_nascimento).`, vscode.DiagnosticSeverity.Warning);
                }
            }

            const regexConst = /\bconst\s+([a-zA-Z0-9_$]+)/g;
            let matchConst;
            while ((matchConst = regexConst.exec(text)) !== null) {
                const constName = matchConst[1];
                if (/[a-z][A-Z]/.test(constName)) {
                    // Trocado para Warning (Amarelo)
                    adicionarAviso(matchConst, 1, `Guia de Idiomas: 'const' deve ser snake_case ou UPPER_CASE, nunca camelCase.`, vscode.DiagnosticSeverity.Warning);
                }
            }

            // 4. ELEMENTOS DOM -> $prefixo. Suporta document.x, $() e jQuery()
            const regexDOM = /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:document\.(?:querySelector|getElementById)|\$|jQuery)\s*\(/g;
            let matchDOM;
            while ((matchDOM = regexDOM.exec(text)) !== null) {
                const varDOM = matchDOM[1];
                if (!varDOM.startsWith('$')) {
                    adicionarAviso(matchDOM, 1, `Guia de Idiomas: Variáveis de elementos DOM devem usar o $prefixo (ex: $${varDOM}).`, vscode.DiagnosticSeverity.Warning);
                }
            }
        }

        // REGRAS PHP
        if (document.languageId === 'php') {
            // file_put_contents
            const regexFilePut = /\bfile_put_contents\b/g;
            let matchFilePut;
            while ((matchFilePut = regexFilePut.exec(text)) !== null) {
                // Trocado para Warning (Amarelo)
                adicionarAvisoSimples(matchFilePut, `Guia de Idiomas: 'file_put_contents' detectado. Pode indicar código de debug esquecido.`, vscode.DiagnosticSeverity.Warning);
            }

            // VARIÁVEIS LOCAIS (PHP)
            const regexPhpVar = /\$([a-zA-Z0-9_]+)\b/g;
            let matchPhpVar;
            const ignorarPhp = ['this', 'GLOBALS', '_SERVER', '_GET', '_POST', '_FILES', '_COOKIE', '_SESSION', '_REQUEST', '_ENV'];
            
            while ((matchPhpVar = regexPhpVar.exec(text)) !== null) {
                const phpVar = matchPhpVar[1];
                if (!ignorarPhp.includes(phpVar) && /[A-Z]/.test(phpVar)) {
                    // Trocado para Warning (Amarelo)
                    adicionarAviso(matchPhpVar, 1, `Guia de Idiomas: Variáveis PHP devem usar snake_case (ex: $data_nascimento).`, vscode.DiagnosticSeverity.Warning);
                }
            }
        }

        if (diagnostics.length > 0) {
            const rangeTopo = new vscode.Range(0, 0, 0, 0);
            diagnostics.unshift(new vscode.Diagnostic(rangeTopo, `Clean Flow: Exibindo ${diagnostics.length} aviso(s) neste arquivo.`, vscode.DiagnosticSeverity.Information));
        }

        diagnosticCollection.set(document.uri, diagnostics);
    }
    
    vscode.workspace.onDidChangeTextDocument(event => {
        validarDocumento(event.document);
    });

    vscode.workspace.onDidOpenTextDocument(document => {
        validarDocumento(document);
    });

    if (vscode.window.activeTextEditor) {
        validarDocumento(vscode.window.activeTextEditor.document);
    }

    context.subscriptions.push(diagnosticCollection);
}

export function deactivate() {}